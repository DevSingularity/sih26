import 'package:drift/drift.dart';

/// Single-row table: the logged-in user's own profile, written once during
/// setup provisioning so every later app launch can authenticate with zero
/// network calls. Mirrors `self_profile` in 03_mobile_app_schema.sql.
@DataClassName('SelfProfileRow')
class SelfProfile extends Table {
  @override
  String get tableName => 'self_profile';

  /// personnel.id from the central server.
  TextColumn get id => text().named('id')();
  TextColumn get employeeCode => text().named('employee_code')();
  TextColumn get fullName => text().named('full_name')();
  TextColumn get role => text().named('role')();
  TextColumn get designation => text().named('designation').nullable()();

  /// 'MAITRI'
  TextColumn get stationId => text().named('station_id')();

  /// Cached credential for offline login.
  TextColumn get authTokenHash => text().named('auth_token_hash').nullable()();

  /// This device's UUID, registered with the Maitri server.
  TextColumn get deviceId => text().named('device_id')();

  @override
  Set<Column> get primaryKey => {id};
}
