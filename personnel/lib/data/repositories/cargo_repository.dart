import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../local/database.dart';
import 'sync_repository.dart';

/// Repository for section 3 "Cargo Handling". Coordinates all local database
/// operations on the `cargo_items_local` table and updates `outbox_queue`
/// atomically via the [SyncRepository] helper.
class CargoRepository {
  CargoRepository(this._db, this._syncRepository);

  final AppDatabase _db;
  final SyncRepository _syncRepository;
  static const _uuid = Uuid();

  /// Scans a new item (stage 1/4 of the cargo handling flow)
  Future<void> scanItem({
    required String itemName,
    String? barcode,
    String? shipmentId,
    String? category,
    required double quantity,
    String? unit,
    double? weightKg,
  }) async {
    final id = _uuid.v4();
    final scannedAt = DateTime.now().toUtc().toIso8601String();
    final createdAt = DateTime.now().toUtc().toIso8601String();
    final updatedAt = DateTime.now().toUtc().toIso8601String();

    await _syncRepository.writeWithOutbox(
      entityTable: 'cargo_items_local',
      entityId: id,
      operation: 'insert',
      priority: 'normal',
      payload: {
        'id': id,
        'shipment_id': shipmentId,
        'item_name': itemName,
        'category': category,
        'quantity': quantity,
        'unit': unit,
        'weight_kg': weightKg,
        'barcode': barcode,
        'status': 'scanned',
        'photo_path': null,
        'scanned_at': scannedAt,
        'verified_at': null,
        'confirmed_at': null,
        'created_at': createdAt,
        'updated_at': updatedAt,
      },
      writeLocalRow: () => _db.into(_db.cargoItemsLocal).insert(
            CargoItemsLocalCompanion.insert(
              id: id,
              shipmentId: Value(shipmentId),
              itemName: itemName,
              category: Value(category),
              quantity: Value(quantity),
              unit: Value(unit),
              weightKg: Value(weightKg),
              barcode: Value(barcode),
              status: const Value('scanned'),
              photoPath: const Value(null),
              scannedAt: Value(scannedAt),
              createdAt: Value(createdAt),
              updatedAt: Value(updatedAt),
            ),
          ),
    );
  }

  /// Updates status to 'uploaded' and attaches photo path (stage 2/4)
  Future<void> markUploaded({
    required String id,
    required String photoPath,
  }) async {
    final updatedAt = DateTime.now().toUtc().toIso8601String();
    final currentItem = await (_db.select(_db.cargoItemsLocal)..where((t) => t.id.equals(id))).getSingle();

    await _syncRepository.writeWithOutbox(
      entityTable: 'cargo_items_local',
      entityId: id,
      operation: 'update',
      priority: 'normal',
      payload: {
        'id': id,
        'shipment_id': currentItem.shipmentId,
        'item_name': currentItem.itemName,
        'category': currentItem.category,
        'quantity': currentItem.quantity,
        'unit': currentItem.unit,
        'weight_kg': currentItem.weightKg,
        'barcode': currentItem.barcode,
        'status': 'uploaded',
        'photo_path': photoPath,
        'scanned_at': currentItem.scannedAt,
        'verified_at': currentItem.verifiedAt,
        'confirmed_at': currentItem.confirmedAt,
        'created_at': currentItem.createdAt,
        'updated_at': updatedAt,
      },
      writeLocalRow: () => (_db.update(_db.cargoItemsLocal)..where((t) => t.id.equals(id))).write(
            CargoItemsLocalCompanion(
              status: const Value('uploaded'),
              photoPath: Value(photoPath),
              updatedAt: Value(updatedAt),
            ),
          ),
    );
  }

  /// Verifies item match (stage 3/4)
  Future<void> verifyItem({required String id}) async {
    final verifiedAt = DateTime.now().toUtc().toIso8601String();
    final updatedAt = DateTime.now().toUtc().toIso8601String();
    final currentItem = await (_db.select(_db.cargoItemsLocal)..where((t) => t.id.equals(id))).getSingle();

    await _syncRepository.writeWithOutbox(
      entityTable: 'cargo_items_local',
      entityId: id,
      operation: 'update',
      priority: 'normal',
      payload: {
        'id': id,
        'shipment_id': currentItem.shipmentId,
        'item_name': currentItem.itemName,
        'category': currentItem.category,
        'quantity': currentItem.quantity,
        'unit': currentItem.unit,
        'weight_kg': currentItem.weightKg,
        'barcode': currentItem.barcode,
        'status': 'verified',
        'photo_path': currentItem.photoPath,
        'scanned_at': currentItem.scannedAt,
        'verified_at': verifiedAt,
        'confirmed_at': currentItem.confirmedAt,
        'created_at': currentItem.createdAt,
        'updated_at': updatedAt,
      },
      writeLocalRow: () => (_db.update(_db.cargoItemsLocal)..where((t) => t.id.equals(id))).write(
            CargoItemsLocalCompanion(
              status: const Value('verified'),
              verifiedAt: Value(verifiedAt),
              updatedAt: Value(updatedAt),
            ),
          ),
    );
  }

  /// Confirms physical delivery (stage 4/4)
  Future<void> confirmItem({required String id}) async {
    final confirmedAt = DateTime.now().toUtc().toIso8601String();
    final updatedAt = DateTime.now().toUtc().toIso8601String();
    final currentItem = await (_db.select(_db.cargoItemsLocal)..where((t) => t.id.equals(id))).getSingle();

    await _syncRepository.writeWithOutbox(
      entityTable: 'cargo_items_local',
      entityId: id,
      operation: 'update',
      priority: 'normal',
      payload: {
        'id': id,
        'shipment_id': currentItem.shipmentId,
        'item_name': currentItem.itemName,
        'category': currentItem.category,
        'quantity': currentItem.quantity,
        'unit': currentItem.unit,
        'weight_kg': currentItem.weightKg,
        'barcode': currentItem.barcode,
        'status': 'confirmed',
        'photo_path': currentItem.photoPath,
        'scanned_at': currentItem.scannedAt,
        'verified_at': currentItem.verifiedAt,
        'confirmed_at': confirmedAt,
        'created_at': currentItem.createdAt,
        'updated_at': updatedAt,
      },
      writeLocalRow: () => (_db.update(_db.cargoItemsLocal)..where((t) => t.id.equals(id))).write(
            CargoItemsLocalCompanion(
              status: const Value('confirmed'),
              confirmedAt: Value(confirmedAt),
              updatedAt: Value(updatedAt),
            ),
          ),
    );
  }

  /// Streams active cargo items (status is scanned, uploaded, or verified)
  Stream<List<CargoItemLocalRow>> watchActive() {
    return (_db.select(_db.cargoItemsLocal)
          ..where((t) => t.status.isIn(['scanned', 'uploaded', 'verified']))
          ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)]))
        .watch();
  }

  /// Streams confirmed cargo items
  Stream<List<CargoItemLocalRow>> watchConfirmed() {
    return (_db.select(_db.cargoItemsLocal)
          ..where((t) => t.status.equals('confirmed'))
          ..orderBy([(t) => OrderingTerm.desc(t.confirmedAt)]))
        .watch();
  }

  /// Streams count of outbox queue rows pending synchronization for this entity table
  Stream<int> watchPendingCount() {
    return _syncRepository.watchPendingCount('cargo_items_local');
  }
}
