import 'package:drift/drift.dart';

/// Cargo handling: scan -> upload -> verify -> confirm. Each stage
/// transition is written here plus a matching `outbox_queue` row, so a
/// partially-completed item survives an app restart mid-flow. Mirrors
/// `cargo_items_local` in 03_mobile_app_schema.sql.
@DataClassName('CargoItemLocalRow')
class CargoItemsLocal extends Table {
  @override
  String get tableName => 'cargo_items_local';

  /// Client-generated UUID.
  TextColumn get id => text().named('id')();
  TextColumn get shipmentId => text().named('shipment_id').nullable()();
  TextColumn get itemName => text().named('item_name')();
  TextColumn get category => text().named('category').nullable()();
  RealColumn get quantity => real().named('quantity').withDefault(const Constant(0.0))();
  TextColumn get unit => text().named('unit').nullable()();
  RealColumn get weightKg => real().named('weight_kg').nullable()();
  TextColumn get barcode => text().named('barcode').nullable()();

  TextColumn get status => text()
      .named('status')
      .withDefault(const Constant('scanned'))
      .customConstraint("NOT NULL DEFAULT 'scanned' "
          "CHECK (status IN ('scanned','uploaded','verified','confirmed'))")();

  /// Local file path; uploaded when online.
  TextColumn get photoPath => text().named('photo_path').nullable()();

  TextColumn get scannedAt => text().named('scanned_at').nullable()();
  TextColumn get verifiedAt => text().named('verified_at').nullable()();
  TextColumn get confirmedAt => text().named('confirmed_at').nullable()();

  TextColumn get createdAt => text()
      .named('created_at')
      .clientDefault(() => DateTime.now().toUtc().toIso8601String())();
  TextColumn get updatedAt => text()
      .named('updated_at')
      .clientDefault(() => DateTime.now().toUtc().toIso8601String())();

  /// 0 = pending in outbox, 1 = confirmed synced.
  BoolColumn get isSynced => boolean().named('is_synced').withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}
