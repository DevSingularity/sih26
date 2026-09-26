import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../local/database.dart';
import 'sync_repository.dart';

/// Feature-specific repository for the Field Updates screen. Owns nothing
/// but the shape of a `field_updates_local` row and the payload it hands
/// to [SyncRepository] — the write-then-outbox mechanics live there.
class FieldUpdatesRepository {
  FieldUpdatesRepository(this._db, this._syncRepository);

  final AppDatabase _db;
  final SyncRepository _syncRepository;
  static const _uuid = Uuid();

  /// [updateType] must be one of 'daily_activity' | 'site_condition' | 'note'
  /// (matches the CHECK constraint on field_updates_local.update_type).
  /// [attachmentPaths] are local file paths only — uploading the actual
  /// image bytes is the outbox flush's job later, not this repository's.
  Future<FieldUpdateLocalRow> createFieldUpdate({
    required String updateType,
    required String content,
    List<String> attachmentPaths = const [],
  }) async {
    final id = _uuid.v4();
    final occurredAt = DateTime.now().toUtc().toIso8601String();
    final attachmentPathsJson =
        attachmentPaths.isEmpty ? null : jsonEncode(attachmentPaths);

    await _syncRepository.writeWithOutbox(
      entityTable: 'field_updates_local',
      entityId: id,
      operation: 'insert',
      priority: 'normal',
      payload: {
        'id': id,
        'update_type': updateType,
        'content': content,
        'attachment_paths': attachmentPaths,
        'occurred_at': occurredAt,
      },
      writeLocalRow: () => _db.into(_db.fieldUpdatesLocal).insert(
            FieldUpdatesLocalCompanion.insert(
              id: id,
              updateType: updateType,
              content: content,
              attachmentPaths: Value(attachmentPathsJson),
              occurredAt: Value(occurredAt),
            ),
          ),
    );

    return (await (_db.select(_db.fieldUpdatesLocal)
          ..where((t) => t.id.equals(id)))
        .getSingle());
  }

  /// Most recent field updates first — the screen's history list.
  Stream<List<FieldUpdateLocalRow>> watchRecent({int limit = 50}) {
    return (_db.select(_db.fieldUpdatesLocal)
          ..orderBy([(t) => OrderingTerm.desc(t.occurredAt)])
          ..limit(limit))
        .watch();
  }

  /// Pending-sync count for this entity table, for the screen's status pill.
  Stream<int> watchPendingCount() =>
      _syncRepository.watchPendingCount('field_updates_local');
}
