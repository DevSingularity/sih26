import 'package:drift/drift.dart';

/// Connectivity heartbeat log; the sync engine consults the latest row
/// before attempting a flush. Mirrors `connectivity_log` in
/// 03_mobile_app_schema.sql.
@DataClassName('ConnectivityLogRow')
class ConnectivityLog extends Table {
  @override
  String get tableName => 'connectivity_log';

  IntColumn get id => integer().named('id').autoIncrement()();

  TextColumn get checkedAt => text()
      .named('checked_at')
      .clientDefault(() => DateTime.now().toUtc().toIso8601String())();

  /// 0/1.
  BoolColumn get isOnline => boolean().named('is_online')();

  /// 'satellite', 'wifi', 'none'.
  TextColumn get linkType => text().named('link_type').nullable()();
}
