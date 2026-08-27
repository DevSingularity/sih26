import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:polarops_personnel_app/data/local/database.dart';
import 'package:polarops_personnel_app/data/repositories/sync_repository.dart';

void main() {
  late AppDatabase database;
  late SyncRepository repository;

  setUp(() {
    database = AppDatabase.withExecutor(NativeDatabase.memory());
    repository = SyncRepository(database);
  });

  tearDown(() async {
    await database.close();
  });

  group('SyncRepository - Outbox & Writes', () {
    test('writeWithOutbox inserts a row locally and in the outbox atomically', () async {
      await repository.writeWithOutbox(
        writeLocalRow: () async {
          await database.into(database.fieldUpdatesLocal).insert(
                FieldUpdatesLocalCompanion.insert(
                  id: 'update_1',
                  updateType: 'daily_activity',
                  content: 'Test content',
                ),
              );
        },
        entityTable: 'field_updates_local',
        entityId: 'update_1',
        operation: 'insert',
        payload: {'content': 'Test content'},
      );

      final localRows = await database.select(database.fieldUpdatesLocal).get();
      expect(localRows, hasLength(1));
      expect(localRows.single.content, 'Test content');

      final outboxRows = await database.select(database.outboxQueue).get();
      expect(outboxRows, hasLength(1));
      expect(outboxRows.single.entityTable, 'field_updates_local');
      expect(outboxRows.single.entityId, 'update_1');
      expect(outboxRows.single.status, 'pending');
      expect(outboxRows.single.priority, 'normal');
    });

    test('writeWithOutbox rolls back everything on local row failure', () async {
      try {
        await repository.writeWithOutbox(
          writeLocalRow: () async {
            throw Exception('Local database write failure simulation');
          },
          entityTable: 'field_updates_local',
          entityId: 'update_1',
          operation: 'insert',
          payload: {'notes': 'Test notes'},
        );
        fail('Should have thrown an exception');
      } catch (e) {
        expect(e.toString(), contains('Local database write failure simulation'));
      }

      final localRows = await database.select(database.fieldUpdatesLocal).get();
      expect(localRows, isEmpty);

      final outboxRows = await database.select(database.outboxQueue).get();
      expect(outboxRows, isEmpty);
    });

    test('fetchPendingBatch prioritizes immediate before normal, then oldest first', () async {
      // 1. Enqueue normal item (older)
      await repository.writeWithOutbox(
        writeLocalRow: () async {},
        entityTable: 'field_updates_local',
        entityId: 'normal_old',
        operation: 'insert',
        payload: {},
        priority: 'normal',
      );

      // Wait a tiny bit to separate timestamps
      await Future.delayed(const Duration(milliseconds: 10));

      // 2. Enqueue immediate item (newer)
      await repository.writeWithOutbox(
        writeLocalRow: () async {},
        entityTable: 'field_updates_local',
        entityId: 'immediate_new',
        operation: 'insert',
        payload: {},
        priority: 'immediate',
      );

      // 3. Enqueue normal item (newer)
      await repository.writeWithOutbox(
        writeLocalRow: () async {},
        entityTable: 'field_updates_local',
        entityId: 'normal_new',
        operation: 'insert',
        payload: {},
        priority: 'normal',
      );

      final batch = await repository.fetchPendingBatch();
      expect(batch, hasLength(3));
      
      // First is immediate_new (prioritized)
      expect(batch[0].entityId, 'immediate_new');
      
      // Second is normal_old (oldest normal)
      expect(batch[1].entityId, 'normal_old');
      
      // Third is normal_new (newest normal)
      expect(batch[2].entityId, 'normal_new');
    });

    test('watchTotalPendingCount watches updates to pending and sending records', () async {
      expect(await repository.watchTotalPendingCount().first, 0);

      // Add normal record
      await repository.writeWithOutbox(
        writeLocalRow: () async {},
        entityTable: 'field_updates_local',
        entityId: 'item_1',
        operation: 'insert',
        payload: {},
      );
      expect(await repository.watchTotalPendingCount().first, 1);

      // Add another normal record
      await repository.writeWithOutbox(
        writeLocalRow: () async {},
        entityTable: 'field_updates_local',
        entityId: 'item_2',
        operation: 'insert',
        payload: {},
      );
      expect(await repository.watchTotalPendingCount().first, 2);

      final batch = await repository.fetchPendingBatch();
      await repository.markSending([batch[0].outboxId]);
      
      // Marking sending doesn't lower total pending count because watchTotalPendingCount checks ['pending', 'sending']
      expect(await repository.watchTotalPendingCount().first, 2);

      // Let's mark it accepted (which sets status = 'sent')
      await repository.markAccepted(batch[0]);
      expect(await repository.watchTotalPendingCount().first, 1);

      await repository.markAccepted(batch[1]);
      expect(await repository.watchTotalPendingCount().first, 0);
    });

    test('recordBatchStarted and recordBatchCompleted log batch metadata successfully', () async {
      final batchId = 'batch_uuid_123';
      
      await repository.recordBatchStarted(batchId: batchId, recordCount: 5);
      
      final initialBatches = await database.select(database.syncBatchesLocal).get();
      expect(initialBatches, hasLength(1));
      expect(initialBatches.single.id, batchId);
      expect(initialBatches.single.recordCount, 5);
      expect(initialBatches.single.status, 'in_progress');
      expect(initialBatches.single.completedAt, isNull);

      await repository.recordBatchCompleted(batchId, success: true);

      final finalBatches = await database.select(database.syncBatchesLocal).get();
      expect(finalBatches, hasLength(1));
      expect(finalBatches.single.status, 'success');
      expect(finalBatches.single.completedAt, isNotNull);
    });
  });
}
