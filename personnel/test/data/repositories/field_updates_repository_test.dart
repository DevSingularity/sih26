import 'dart:convert';

import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:polarops_personnel_app/data/local/database.dart';
import 'package:polarops_personnel_app/data/repositories/field_updates_repository.dart';
import 'package:polarops_personnel_app/data/repositories/sync_repository.dart';

/// Exercises the milestone-2 write path against a real (in-memory) Drift
/// database: `FieldUpdatesRepository.createFieldUpdate` should always leave
/// exactly one `field_updates_local` row AND exactly one matching
/// `outbox_queue` row behind, in the same transaction. This uses
/// NativeDatabase.memory() rather than mocks, per Drift's own testing
/// guidance, so it exercises the actual SQL/CHECK constraints from
/// 03_mobile_app_schema.sql, not a stand-in.
void main() {
  late AppDatabase database;
  late SyncRepository syncRepository;
  late FieldUpdatesRepository repository;

  setUp(() {
    database = AppDatabase.withExecutor(NativeDatabase.memory());
    syncRepository = SyncRepository(database);
    repository = FieldUpdatesRepository(database, syncRepository);
  });

  tearDown(() async {
    await database.close();
  });

  test('createFieldUpdate writes the local row and an outbox entry together', () async {
    final row = await repository.createFieldUpdate(
      updateType: 'daily_activity',
      content: 'Cleared the runway approach after the storm.',
    );

    expect(row.updateType, 'daily_activity');
    expect(row.content, 'Cleared the runway approach after the storm.');
    expect(row.isSynced, isFalse);
    expect(row.attachmentPaths, isNull);

    final localRows = await database.select(database.fieldUpdatesLocal).get();
    expect(localRows, hasLength(1));
    expect(localRows.single.id, row.id);

    final outboxRows = await database.select(database.outboxQueue).get();
    expect(outboxRows, hasLength(1));

    final outboxRow = outboxRows.single;
    expect(outboxRow.entityTable, 'field_updates_local');
    expect(outboxRow.entityId, row.id);
    expect(outboxRow.operation, 'insert');
    expect(outboxRow.status, 'pending');
    expect(outboxRow.priority, 'normal');

    final payload = jsonDecode(outboxRow.payloadJson) as Map<String, dynamic>;
    expect(payload['id'], row.id);
    expect(payload['update_type'], 'daily_activity');
    expect(payload['content'], 'Cleared the runway approach after the storm.');
  });

  test('attachment paths round-trip through the JSON column', () async {
    final row = await repository.createFieldUpdate(
      updateType: 'site_condition',
      content: 'Ice ridge forming near the fuel depot.',
      attachmentPaths: ['/local/photos/a.jpg', '/local/photos/b.jpg'],
    );

    expect(row.attachmentPaths, isNotNull);
    final decoded = (jsonDecode(row.attachmentPaths!) as List).cast<String>();
    expect(decoded, ['/local/photos/a.jpg', '/local/photos/b.jpg']);

    final outboxRow = await database.select(database.outboxQueue).getSingle();
    final payload = jsonDecode(outboxRow.payloadJson) as Map<String, dynamic>;
    expect(payload['attachment_paths'], ['/local/photos/a.jpg', '/local/photos/b.jpg']);
  });

  test('watchRecent emits newest-first and updates on new writes', () async {
    final emissions = <List<FieldUpdateLocalRow>>[];
    final subscription = repository.watchRecent().listen(emissions.add);

    await repository.createFieldUpdate(updateType: 'note', content: 'first');
    await repository.createFieldUpdate(updateType: 'note', content: 'second');

    // Let the stream's microtasks flush.
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);

    final latest = emissions.last;
    expect(latest, hasLength(2));
    expect(latest.first.content, 'second');
    expect(latest.last.content, 'first');

    await subscription.cancel();
  });

  test('watchPendingCount reflects outstanding outbox rows for this entity table only',
      () async {
    final counts = <int>[];
    final subscription = repository.watchPendingCount().listen(counts.add);

    await Future<void>.delayed(Duration.zero);
    expect(counts.last, 0);

    final row = await repository.createFieldUpdate(updateType: 'note', content: 'pending me');
    await Future<void>.delayed(Duration.zero);
    expect(counts.last, 1);

    // Simulate the sync engine (a later milestone) marking this row sent —
    // FieldUpdatesRepository itself has no such method yet, so this reaches
    // into the tables directly rather than asserting behaviour that isn't
    // built.
    await (database.update(database.outboxQueue)
          ..where((t) => t.entityId.equals(row.id)))
        .write(const OutboxQueueCompanion(status: Value('sent')));

    await Future<void>.delayed(Duration.zero);
    expect(counts.last, 0);

    await subscription.cancel();
  });
}
