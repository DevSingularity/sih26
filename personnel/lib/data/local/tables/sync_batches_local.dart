import 'package:drift/drift.dart';

/// One row per flush attempt to the Maitri station server, keyed by the
/// same batch_id sent over the wire — this is what lets a retried flush
/// be idempotent on the station server side. Mirrors `sync_batches_local`
/// in 03_mobile_app_schema.sql.
@DataClassName('SyncBatchLocalRow')
class SyncBatchesLocal extends Table {
  @override
  String get tableName => 'sync_batches_local';

  /// batch_id sent to the server.
  TextColumn get id => text().named('id')();
  IntColumn get recordCount => integer().named('record_count')();

  TextColumn get startedAt => text()
      .named('started_at')
      .clientDefault(() => DateTime.now().toUtc().toIso8601String())();
  TextColumn get completedAt => text().named('completed_at').nullable()();

  TextColumn get status => text()
      .named('status')
      .withDefault(const Constant('in_progress'))
      .customConstraint("NOT NULL DEFAULT 'in_progress' "
          "CHECK (status IN ('in_progress','success','failed'))")();

  @override
  Set<Column> get primaryKey => {id};
}
