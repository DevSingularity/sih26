import 'dart:convert';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:polarops_personnel_app/data/local/database.dart';
import 'package:polarops_personnel_app/data/repositories/resource_usage_repository.dart';
import 'package:polarops_personnel_app/data/repositories/sync_repository.dart';

void main() {
  late AppDatabase database;
  late SyncRepository syncRepository;
  late ResourceUsageRepository repository;

  setUp(() {
    database = AppDatabase.withExecutor(NativeDatabase.memory());
    syncRepository = SyncRepository(database);
    repository = ResourceUsageRepository(database, syncRepository);
  });

  tearDown(() async {
    await database.close();
  });

  test('createResourceUsage writes local row and outbox entry correctly', () async {
    await repository.createResourceUsage(
      resourceName: 'Diesel Generator A',
      usageType: 'fuel',
      quantity: 150.5,
      unit: 'liters',
      notes: 'Refueled generator for overnight run.',
    );

    final localRows = await database.select(database.resourceUsageLocal).get();
    expect(localRows, hasLength(1));
    final log = localRows.single;
    expect(log.resourceName, 'Diesel Generator A');
    expect(log.usageType, 'fuel');
    expect(log.quantity, 150.5);
    expect(log.unit, 'liters');
    expect(log.notes, 'Refueled generator for overnight run.');
    expect(log.isSynced, isFalse);

    final outboxRows = await database.select(database.outboxQueue).get();
    expect(outboxRows, hasLength(1));
    final outboxRow = outboxRows.single;
    expect(outboxRow.entityTable, 'resource_usage_local');
    expect(outboxRow.entityId, log.id);
    expect(outboxRow.operation, 'insert');
    expect(outboxRow.status, 'pending');

    final payload = jsonDecode(outboxRow.payloadJson) as Map<String, dynamic>;
    expect(payload['resource_name'], 'Diesel Generator A');
    expect(payload['usage_type'], 'fuel');
    expect(payload['quantity'], 150.5);
  });

  test('watchRecent logs emissions and orders descending', () async {
    final emissions = <List<ResourceUsageLocalRow>>[];
    final subscription = repository.watchRecent().listen(emissions.add);

    await repository.createResourceUsage(
      resourceName: 'First Log',
      usageType: 'power',
      quantity: 10,
    );
    await repository.createResourceUsage(
      resourceName: 'Second Log',
      usageType: 'equipment',
      quantity: 2,
    );

    await Future<void>.delayed(Duration.zero);
    expect(emissions.last, hasLength(2));
    expect(emissions.last.first.resourceName, 'Second Log');
    expect(emissions.last.last.resourceName, 'First Log');

    await subscription.cancel();
  });
}
