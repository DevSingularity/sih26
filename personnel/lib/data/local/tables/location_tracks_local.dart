import 'package:drift/drift.dart';

/// One row per rollup of the ping buffer (every ~2-5 min or ~50 points,
/// whichever comes first) — this is the only location artifact that ever
/// gets an outbox entry. Mirrors `location_tracks_local` in
/// 03_mobile_app_schema.sql.
@DataClassName('LocationTrackLocalRow')
class LocationTracksLocal extends Table {
  @override
  String get tableName => 'location_tracks_local';

  /// Batch id; reused unchanged all the way to the central server.
  TextColumn get id => text().named('id')();

  /// JSON array of {lat,lng,accuracy_m,recorded_at}.
  TextColumn get pointsJson => text().named('points_json')();
  IntColumn get pointCount => integer().named('point_count')();

  /// recorded_at of the first point in the batch.
  TextColumn get trackStartedAt => text().named('track_started_at')();

  /// recorded_at of the last point in the batch.
  TextColumn get trackEndedAt => text().named('track_ended_at')();

  BoolColumn get isSynced => boolean().named('is_synced').withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}
