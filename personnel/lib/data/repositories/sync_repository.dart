import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../local/database.dart';

/// One pending outbox row, plus its payload already decoded — this is
/// exactly what [SyncEngine] needs to build a `/api/sync/push` request
/// without knowing anything about Drift.
class PendingOutboxRecord {
  PendingOutboxRecord({
    required this.outboxId,
    required this.entityTable,
    required this.entityId,
    required this.operation,
    required this.payload,
  });

  final String outboxId;
  final String entityTable;
  final String entityId;
  final String operation;
  final Map<String, Object?> payload;
}

/// The `entity_table` values ever written into `outbox_queue` (see every
/// `*_repository.dart`). Kept as an explicit allow-list because
/// [SyncRepository.markEntitySynced] interpolates this value into a raw
/// SQL statement — the value itself is always one we generated, never
/// user/network input, but the allow-list keeps it that way defensively
/// rather than trusting that invariant forever.
const _syncableEntityTables = {
  'field_updates_local',
  'cargo_items_local',
  'resource_usage_local',
  'location_tracks_local',
  'sos_incidents_local',
};

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

  /// Total outbox rows still waiting to be sent, across every entity
  /// table — what the persistent sync-status indicator shows.
  Stream<int> watchTotalPendingCount() {
    final count = _db.outboxQueue.id.count();
    final query = _db.selectOnly(_db.outboxQueue)
      ..addColumns([count])
      ..where(_db.outboxQueue.status.isIn(const ['pending', 'sending']));
    return query.map((row) => row.read(count) ?? 0).watchSingle();
  }

  /// The next batch to flush: `priority` DESC (so 'immediate'/SOS rows
  /// sort before 'normal' — 'i' > 'n' lexically, which is a happy
  /// accident, so this spells it out with a CASE instead of relying on
  /// that), then `created_at` ASC (oldest first within a priority tier).
  /// Section 5 of the build prompt.
  Future<List<PendingOutboxRecord>> fetchPendingBatch({int limit = 50}) async {
    // Explicit CASE rather than relying on 'immediate' sorting before
    // 'normal' lexically (it currently does, but that's an accident of
    // the two literal strings chosen, not a guarantee).
    const priorityRank =
        CustomExpression<int>("CASE priority WHEN 'immediate' THEN 0 ELSE 1 END");
    final query = _db.select(_db.outboxQueue)
      ..where((t) => t.status.equals('pending'))
      ..orderBy([
        (_) => OrderingTerm.asc(priorityRank),
        (t) => OrderingTerm.asc(t.createdAt),
      ])
      ..limit(limit);
    final rows = await query.get();

    return rows
        .map((r) => PendingOutboxRecord(
              outboxId: r.id,
              entityTable: r.entityTable,
              entityId: r.entityId,
              operation: r.operation,
              payload: jsonDecode(r.payloadJson) as Map<String, Object?>,
            ))
        .toList();
  }

  /// Marks a set of outbox rows 'sending' right before they go out on the
  /// wire, so a second flush attempt racing the first one (e.g. the SOS
  /// out-of-cycle trigger firing while the normal loop is mid-flush)
  /// can't pick up and double-send the same rows.
  Future<void> markSending(List<String> outboxIds) async {
    if (outboxIds.isEmpty) return;
    await (_db.update(_db.outboxQueue)..where((t) => t.id.isIn(outboxIds)))
        .write(const OutboxQueueCompanion(status: Value('sending')));
  }

  /// A record the station server accepted: outbox row -> 'sent', and the
  /// source `*_local` row's own `is_synced` flag flipped, in one
  /// transaction.
  Future<void> markAccepted(PendingOutboxRecord record) async {
    await _db.transaction(() async {
      await (_db.update(_db.outboxQueue)..where((t) => t.id.equals(record.outboxId)))
          .write(const OutboxQueueCompanion(status: Value('sent')));
      await markEntitySynced(record.entityTable, record.entityId);
    });
  }

  /// A record the station server rejected, or one that was 'sending' when
  /// the whole batch attempt failed (timeout/no response/5xx): back to
  /// 'pending' so the next flush picks it up again, with the attempt
  /// bookkeeping updated either way.
  Future<void> markPendingRetry(String outboxId, {String? reason}) async {
    final row = await (_db.select(_db.outboxQueue)..where((t) => t.id.equals(outboxId)))
        .getSingleOrNull();
    await (_db.update(_db.outboxQueue)..where((t) => t.id.equals(outboxId))).write(
      OutboxQueueCompanion(
        status: const Value('pending'),
        attemptCount: Value((row?.attemptCount ?? 0) + 1),
        lastAttemptAt: Value(DateTime.now().toUtc().toIso8601String()),
      ),
    );
    if (reason != null) {
      // Debugging aid only — no dedicated column for this in the schema,
      // and adding one is out of scope here, so it just goes to the log.
      // ignore: avoid_print
      print('outbox row $outboxId rejected/failed: $reason');
    }
  }

  /// Sets `is_synced = 1` on the source row in [entityTable] for
  /// [entityId]. Every `*_local` table that ever gets an outbox entry has
  /// exactly this `id` primary key + `is_synced` column shape (see
  /// 03_mobile_app_schema.sql), so one statement covers all of them
  /// instead of a switch over Drift table objects.
  Future<void> markEntitySynced(String entityTable, String entityId) async {
    if (!_syncableEntityTables.contains(entityTable)) {
      throw ArgumentError('Unknown/unsyncable entity table: $entityTable');
    }
    await _db.customStatement(
      'UPDATE $entityTable SET is_synced = 1 WHERE id = ?',
      [entityId],
    );
  }

  /// One `sync_batches_local` row per flush attempt (build prompt section
  /// 5) — this is what makes a retried flush idempotent on the station
  /// server side via `(device_id, batch_id)`.
  Future<void> recordBatchStarted({required String batchId, required int recordCount}) async {
    await _db.into(_db.syncBatchesLocal).insert(
          SyncBatchesLocalCompanion.insert(
            id: batchId,
            recordCount: recordCount,
          ),
        );
  }

  Future<void> recordBatchCompleted(String batchId, {required bool success}) async {
    await (_db.update(_db.syncBatchesLocal)..where((t) => t.id.equals(batchId))).write(
      OutboxBatchStatus.companion(success),
    );
  }

  Stream<List<SyncBatchLocalRow>> watchRecentBatches({int limit = 20}) {
    return (_db.select(_db.syncBatchesLocal)
          ..orderBy([(t) => OrderingTerm.desc(t.startedAt)])
          ..limit(limit))
        .watch();
  }
}

/// Tiny helper so [SyncRepository.recordBatchCompleted] doesn't repeat
/// the same three-field companion in two call sites (success/failure).
class OutboxBatchStatus {
  static SyncBatchesLocalCompanion companion(bool success) => SyncBatchesLocalCompanion(
        status: Value(success ? 'success' : 'failed'),
        completedAt: Value(DateTime.now().toUtc().toIso8601String()),
      );
}
