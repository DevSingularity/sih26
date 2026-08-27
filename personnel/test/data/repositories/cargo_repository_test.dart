import 'dart:convert';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:polarops_personnel_app/data/local/database.dart';
import 'package:polarops_personnel_app/data/repositories/cargo_repository.dart';
import 'package:polarops_personnel_app/data/repositories/sync_repository.dart';

void main() {
  late AppDatabase database;
  late SyncRepository syncRepository;
  late CargoRepository repository;

  setUp(() {
    database = AppDatabase.withExecutor(NativeDatabase.memory());
    syncRepository = SyncRepository(database);
    repository = CargoRepository(database, syncRepository);
  });

  tearDown(() async {
    await database.close();
  });

  test('scanItem writes local row and outbox entry correctly', () async {
    await repository.scanItem(
      itemName: 'Expedition Rations Box A',
      barcode: '123456789',
      shipmentId: 'SHIP-999',
      category: 'Food',
      quantity: 5,
      unit: 'boxes',
      weightKg: 25.5,
    );

    final localRows = await database.select(database.cargoItemsLocal).get();
    expect(localRows, hasLength(1));
    final item = localRows.single;
    expect(item.itemName, 'Expedition Rations Box A');
    expect(item.barcode, '123456789');
    expect(item.shipmentId, 'SHIP-999');
    expect(item.category, 'Food');
    expect(item.quantity, 5.0);
    expect(item.unit, 'boxes');
    expect(item.weightKg, 25.5);
    expect(item.status, 'scanned');
    expect(item.photoPath, isNull);
    expect(item.isSynced, isFalse);

    final outboxRows = await database.select(database.outboxQueue).get();
    expect(outboxRows, hasLength(1));
    final outboxRow = outboxRows.single;
    expect(outboxRow.entityTable, 'cargo_items_local');
    expect(outboxRow.entityId, item.id);
    expect(outboxRow.operation, 'insert');
    expect(outboxRow.status, 'pending');

    final payload = jsonDecode(outboxRow.payloadJson) as Map<String, dynamic>;
    expect(payload['item_name'], 'Expedition Rations Box A');
    expect(payload['status'], 'scanned');
  });

  test('markUploaded, verifyItem, and confirmItem advance status and update outbox', () async {
    await repository.scanItem(
      itemName: 'Generators Spare Parts',
      quantity: 1,
    );

    var localRows = await database.select(database.cargoItemsLocal).get();
    final item = localRows.single;

    // 1. Mark Uploaded
    await repository.markUploaded(id: item.id, photoPath: '/local/photos/gen_parts.jpg');
    localRows = await database.select(database.cargoItemsLocal).get();
    expect(localRows.single.status, 'uploaded');
    expect(localRows.single.photoPath, '/local/photos/gen_parts.jpg');

    var outboxRows = await database.select(database.outboxQueue).get();
    expect(outboxRows, hasLength(2)); // Insert + Update
    expect(outboxRows.last.operation, 'update');
    var payload = jsonDecode(outboxRows.last.payloadJson) as Map<String, dynamic>;
    expect(payload['status'], 'uploaded');
    expect(payload['photo_path'], '/local/photos/gen_parts.jpg');

    // 2. Verify Item
    await repository.verifyItem(id: item.id);
    localRows = await database.select(database.cargoItemsLocal).get();
    expect(localRows.single.status, 'verified');
    expect(localRows.single.verifiedAt, isNotNull);

    outboxRows = await database.select(database.outboxQueue).get();
    expect(outboxRows, hasLength(3));
    payload = jsonDecode(outboxRows.last.payloadJson) as Map<String, dynamic>;
    expect(payload['status'], 'verified');
    expect(payload['verified_at'], isNotNull);

    // 3. Confirm Item
    await repository.confirmItem(id: item.id);
    localRows = await database.select(database.cargoItemsLocal).get();
    expect(localRows.single.status, 'confirmed');
    expect(localRows.single.confirmedAt, isNotNull);

    outboxRows = await database.select(database.outboxQueue).get();
    expect(outboxRows, hasLength(4));
    payload = jsonDecode(outboxRows.last.payloadJson) as Map<String, dynamic>;
    expect(payload['status'], 'confirmed');
    expect(payload['confirmed_at'], isNotNull);
  });

  test('watchActive and watchConfirmed separate items based on status', () async {
    final activeEmissions = <List<CargoItemLocalRow>>[];
    final confirmedEmissions = <List<CargoItemLocalRow>>[];

    final activeSub = repository.watchActive().listen(activeEmissions.add);
    final confirmedSub = repository.watchConfirmed().listen(confirmedEmissions.add);

    await repository.scanItem(itemName: 'Active Item 1', quantity: 2);
    await repository.scanItem(itemName: 'Active Item 2', quantity: 1);

    await Future<void>.delayed(Duration.zero);
    expect(activeEmissions.last, hasLength(2));
    expect(confirmedEmissions.last, isEmpty);

    final localRows = await database.select(database.cargoItemsLocal).get();
    final firstItem = localRows.firstWhere((t) => t.itemName == 'Active Item 1');

    // Move firstItem to confirmed
    await repository.markUploaded(id: firstItem.id, photoPath: '/photo.jpg');
    await repository.verifyItem(id: firstItem.id);
    await repository.confirmItem(id: firstItem.id);

    await Future<void>.delayed(Duration.zero);
    expect(activeEmissions.last, hasLength(1));
    expect(activeEmissions.last.single.itemName, 'Active Item 2');
    expect(confirmedEmissions.last, hasLength(1));
    expect(confirmedEmissions.last.single.itemName, 'Active Item 1');

    await activeSub.cancel();
    await confirmedSub.cancel();
  });
}
