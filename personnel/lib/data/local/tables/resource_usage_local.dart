import 'package:drift/drift.dart';

/// Quick-entry fuel/power/equipment usage. Mirrors `resource_usage_local`
/// in 03_mobile_app_schema.sql.
@DataClassName('ResourceUsageLocalRow')
class ResourceUsageLocal extends Table {
  @override
  String get tableName => 'resource_usage_local';

  TextColumn get id => text().named('id')();
  TextColumn get resourceName => text().named('resource_name')();

  TextColumn get usageType => text()
      .named('usage_type')
      .customConstraint("NOT NULL CHECK (usage_type IN ('fuel','power','equipment'))")();

  RealColumn get quantity => real().named('quantity')();
  TextColumn get unit => text().named('unit').nullable()();
  TextColumn get notes => text().named('notes').nullable()();

  TextColumn get occurredAt => text()
      .named('occurred_at')
      .clientDefault(() => DateTime.now().toUtc().toIso8601String())();

  BoolColumn get isSynced => boolean().named('is_synced').withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}
