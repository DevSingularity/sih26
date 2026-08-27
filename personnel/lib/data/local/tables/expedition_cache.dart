import 'package:drift/drift.dart';

/// Read-only cache of the active expedition/resource plan, for reference
/// while filling out forms offline. Mirrors `expedition_cache` in
/// 03_mobile_app_schema.sql.
@DataClassName('ExpeditionCacheRow')
class ExpeditionCache extends Table {
  @override
  String get tableName => 'expedition_cache';

  TextColumn get id => text().named('id')();
  TextColumn get name => text().named('name')();
  TextColumn get status => text().named('status').nullable()();

  /// JSON-encoded.
  TextColumn get resourcePlanJson => text().named('resource_plan_json').nullable()();

  TextColumn get cachedAt => text()
      .named('cached_at')
      .clientDefault(() => DateTime.now().toUtc().toIso8601String())();

  @override
  Set<Column> get primaryKey => {id};
}
