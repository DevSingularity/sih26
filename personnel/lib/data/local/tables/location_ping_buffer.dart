import 'package:drift/drift.dart';

/// Every raw GPS reading lands here the instant it's captured. Scratch
/// space only — never synced, never given an outbox entry directly; the
/// rollup job (see location_rollup_job.dart) drains this into
/// [LocationTracksLocal]. Mirrors `location_ping_buffer` in
/// 03_mobile_app_schema.sql.
@DataClassName('LocationPingBufferRow')
class LocationPingBuffer extends Table {
  @override
  String get tableName => 'location_ping_buffer';

  TextColumn get id => text().named('id')();
  RealColumn get latitude => real().named('latitude')();
  RealColumn get longitude => real().named('longitude')();
  RealColumn get accuracyM => real().named('accuracy_m').nullable()();

  TextColumn get recordedAt => text()
      .named('recorded_at')
      .clientDefault(() => DateTime.now().toUtc().toIso8601String())();

  @override
  Set<Column> get primaryKey => {id};
}
