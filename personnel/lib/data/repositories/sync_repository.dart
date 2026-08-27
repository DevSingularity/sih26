import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../local/database.dart';

/// The one place every feature repository routes local writes through:
/// (1) write the feature's `*_local` row, (2) insert the matching
/// `outbox_queue` row — both in a single Drift transaction, so it's
/// impossible for a feature write to land without a matching outbox
/// entry (or vice versa). The sync engine (later milestone) only ever
/// reads `outbox_queue`; it never needs to know the shape of a feature
/// table. See build prompt section 1.
class SyncRepository {
  SyncRepository(this._db);

  final AppDatabase _db;
  static const _uuid = Uuid();

  /// Runs [writeLocalRow] and the matching outbox insert atomically.
  ///
  /// [writeLocalRow] must perform exactly the local write (insert or
  /// update) against the feature table — nothing else — so that if the
  /// transaction rolls back, neither half is left dangling.
  ///
  /// [payload] is the full JSON-serializable snapshot of the row as
  /// stored in `outbox_queue.payload_json` — the exact data the sync
  /// engine will eventually POST to the station server.
  Future<void> writeWithOutbox({
    required Future<void> Function() writeLocalRow,
    required String entityTable,
    required String entityId,
    required String operation, // 'insert' | 'update'
    required Map<String, Object?> payload,
    String priority = 'normal', // 'normal' | 'immediate'
  }) async {
    await _db.transaction(() async {
      await writeLocalRow();
      await _db.into(_db.outboxQueue).insert(
            OutboxQueueCompanion.insert(
              id: _uuid.v4(),
              entityTable: entityTable,
              entityId: entityId,
              operation: operation,
              payloadJson: jsonEncode(payload),
              priority: Value(priority),
            ),
          );
    });
  }

  /// Count of outbox rows still waiting to be sent for one entity table —
  /// used by feature screens to show "N pending sync" without needing to
  /// know anything about the sync engine itself.
  ///
  /// NOTE: the same `count` expression instance is used in both
  /// addColumns and read() below — Drift's TypedResult.read() resolves
  /// by matching the expression object passed to addColumns, so a
  /// freshly-constructed structurally-identical expression is not
  /// guaranteed to resolve the same column. I'm fairly confident this is
  /// correct current Drift behavior, but if `watchPendingCount` ever
  /// returns null/0 unexpectedly, this pairing is the first thing to
  /// check against the installed drift version's docs.
  Stream<int> watchPendingCount(String entityTable) {
    final count = _db.outboxQueue.id.count();
    final query = _db.selectOnly(_db.outboxQueue)
      ..addColumns([count])
      ..where(_db.outboxQueue.entityTable.equals(entityTable) &
          _db.outboxQueue.status.equals('pending'));
    return query.map((row) => row.read(count) ?? 0).watchSingle();
  }
}
