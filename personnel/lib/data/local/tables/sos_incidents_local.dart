import 'package:drift/drift.dart';

/// SOS reports. Written locally first like everything else, but flagged
/// 'immediate' in the outbox so the sync engine tries to send it the
/// moment any connectivity is detected. Mirrors `sos_incidents_local` in
/// 03_mobile_app_schema.sql.
@DataClassName('SosIncidentLocalRow')
class SosIncidentsLocal extends Table {
  @override
  String get tableName => 'sos_incidents_local';

  TextColumn get id => text().named('id')();

  TextColumn get incidentType => text()
      .named('incident_type')
      .customConstraint("NOT NULL CHECK (incident_type IN "
          "('medical','equipment','environmental','other'))")();

  TextColumn get description => text().named('description').nullable()();

  TextColumn get severity => text()
      .named('severity')
      .customConstraint("NOT NULL CHECK (severity IN ('low','medium','high','critical'))")();

  RealColumn get latitude => real().named('latitude').nullable()();
  RealColumn get longitude => real().named('longitude').nullable()();

  TextColumn get status => text().named('status').withDefault(const Constant('reported'))();

  TextColumn get reportedAt => text()
      .named('reported_at')
      .clientDefault(() => DateTime.now().toUtc().toIso8601String())();

  BoolColumn get isSynced => boolean().named('is_synced').withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}
