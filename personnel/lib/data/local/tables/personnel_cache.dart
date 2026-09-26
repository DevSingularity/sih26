import 'package:drift/drift.dart';

/// Read-only cache of teammates at the station, refreshed opportunistically
/// when online. Lets the app show "who's on site" while offline.
/// Mirrors `personnel_cache` in 03_mobile_app_schema.sql.
@DataClassName('PersonnelCacheRow')
class PersonnelCache extends Table {
  @override
  String get tableName => 'personnel_cache';

  TextColumn get id => text().named('id')();
  TextColumn get fullName => text().named('full_name')();
  TextColumn get role => text().named('role')();
  TextColumn get status => text().named('status').withDefault(const Constant('active'))();

  /// ISO-8601 string; set client-side at cache-write time.
  TextColumn get cachedAt => text()
      .named('cached_at')
      .clientDefault(() => DateTime.now().toUtc().toIso8601String())();

  @override
  Set<Column> get primaryKey => {id};
}
