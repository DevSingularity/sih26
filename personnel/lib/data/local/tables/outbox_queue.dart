import 'package:drift/drift.dart';

/// Every write to any `*_local` table also inserts one row here, in the
/// same transaction (see SyncRepository). The sync engine only ever reads
/// this table — it never needs to know the shape of a feature table.
/// Mirrors `outbox_queue` in 03_mobile_app_schema.sql, including the
/// `idx_outbox_pending` index the sync engine's flush query relies on.
@DataClassName('OutboxQueueRow')
@TableIndex(name: 'idx_outbox_pending', columns: {#status, #priority, #createdAt})
class OutboxQueue extends Table {
  @override
  String get tableName => 'outbox_queue';

  /// The outbox row's own UUID.
  TextColumn get id => text().named('id')();

  /// e.g. 'cargo_items_local', 'sos_incidents_local', ...
  TextColumn get entityTable => text().named('entity_table')();

  /// The id of the row in [entityTable].
  TextColumn get entityId => text().named('entity_id')();

  TextColumn get operation => text()
      .named('operation')
      .customConstraint("NOT NULL CHECK (operation IN ('insert','update'))")();

  /// Full row snapshot, JSON-encoded.
  TextColumn get payloadJson => text().named('payload_json')();

  TextColumn get priority => text()
      .named('priority')
      .withDefault(const Constant('normal'))
      .customConstraint("NOT NULL DEFAULT 'normal' "
          "CHECK (priority IN ('normal','immediate'))")();

  TextColumn get createdAt => text()
      .named('created_at')
      .clientDefault(() => DateTime.now().toUtc().toIso8601String())();

  IntColumn get attemptCount => integer().named('attempt_count').withDefault(const Constant(0))();
  TextColumn get lastAttemptAt => text().named('last_attempt_at').nullable()();

  TextColumn get status => text()
      .named('status')
      .withDefault(const Constant('pending'))
      .customConstraint("NOT NULL DEFAULT 'pending' "
          "CHECK (status IN ('pending','sending','sent','failed'))")();

  @override
  Set<Column> get primaryKey => {id};
}
