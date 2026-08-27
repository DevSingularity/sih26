import 'package:drift/drift.dart';

/// Daily activity / site conditions / notes, with optional photo
/// attachments. Mirrors `field_updates_local` in 03_mobile_app_schema.sql.
@DataClassName('FieldUpdateLocalRow')
class FieldUpdatesLocal extends Table {
  @override
  String get tableName => 'field_updates_local';

  TextColumn get id => text().named('id')();

  TextColumn get updateType => text()
      .named('update_type')
      .customConstraint("NOT NULL CHECK (update_type IN "
          "('daily_activity','site_condition','note'))")();

  TextColumn get content => text().named('content')();

  /// JSON array of local file paths.
  TextColumn get attachmentPaths => text().named('attachment_paths').nullable()();

  TextColumn get occurredAt => text()
      .named('occurred_at')
      .clientDefault(() => DateTime.now().toUtc().toIso8601String())();

  BoolColumn get isSynced => boolean().named('is_synced').withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}
