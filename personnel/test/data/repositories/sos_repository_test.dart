import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:drift/drift.dart' hide Column;
import 'package:flutter_test/flutter_test.dart';

import 'package:polarops_personnel_app/data/local/database.dart';
import 'package:polarops_personnel_app/data/repositories/sos_repository.dart';
import 'package:polarops_personnel_app/data/repositories/sync_repository.dart';
import 'package:polarops_personnel_app/services/sync_engine.dart';

// A simple fake HttpClientAdapter to intercept Dio requests for testing
class FakeHttpClientAdapter implements HttpClientAdapter {
  FakeHttpClientAdapter(this.handler);

  final Future<ResponseBody> Function(RequestOptions options) handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) {
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  late AppDatabase database;
  late SyncRepository syncRepository;
  late SosRepository repository;

  setUp(() {
    database = AppDatabase.withExecutor(NativeDatabase.memory());
    syncRepository = SyncRepository(database);
    repository = SosRepository(database, syncRepository);
  });

  tearDown(() async {
    await database.close();
  });

  test('createSosIncident writes local row and outbox with immediate priority', () async {
    await repository.createSosIncident(
      incidentType: 'medical',
      severity: 'critical',
      description: 'Severe cold injury reported near crew site.',
      latitude: -70.7658,
      longitude: 11.7333,
    );

    final localRows = await database.select(database.sosIncidentsLocal).get();
    expect(localRows, hasLength(1));
    final log = localRows.single;
    expect(log.incidentType, 'medical');
    expect(log.severity, 'critical');
    expect(log.description, 'Severe cold injury reported near crew site.');
    expect(log.latitude, -70.7658);
    expect(log.longitude, 11.7333);
    expect(log.isSynced, isFalse);

    final outboxRows = await database.select(database.outboxQueue).get();
    expect(outboxRows, hasLength(1));
    final outboxRow = outboxRows.single;
    expect(outboxRow.entityTable, 'sos_incidents_local');
    expect(outboxRow.entityId, log.id);
    expect(outboxRow.operation, 'insert');
    expect(outboxRow.priority, 'immediate'); // Ensures priority is set to immediate!
    expect(outboxRow.status, 'pending');

    final payload = jsonDecode(outboxRow.payloadJson) as Map<String, dynamic>;
    expect(payload['incident_type'], 'medical');
    expect(payload['severity'], 'critical');
    expect(payload['description'], 'Severe cold injury reported near crew site.');
  });

  test('SyncEngine triggers out-of-cycle sync push and marks synced successfully', () async {
    // 1. Provision the device so SyncEngine has credentials
    await database.into(database.selfProfile).insert(
          const SelfProfileCompanion(
            id: Value('crew_1'),
            employeeCode: Value('EMP01'),
            fullName: Value('John Doe'),
            role: Value('Field Lead'),
            stationId: Value('MAITRI'),
            authTokenHash: Value('hashed_token'),
            deviceId: Value('device_uuid'),
          ),
        );

    // 2. Add an SOS incident
    await repository.createSosIncident(
      incidentType: 'environmental',
      severity: 'high',
      description: 'Storm damage',
    );

    // 3. Setup Fake Dio
    final dio = Dio();
    var apiCalled = false;
    dio.httpClientAdapter = FakeHttpClientAdapter((options) async {
      apiCalled = true;
      expect(options.path, endsWith('/api/sync/push'));
      expect(options.headers['Authorization'], 'Bearer hashed_token');

      final body = options.data as Map<String, dynamic>;
      expect(body['device_id'], 'device_uuid');
      expect(body['records'], hasLength(1));
      expect(body['records'][0]['entity_table'], 'sos_incidents_local');
      expect(body['records'][0]['operation'], 'insert');

      final responsePayload = {'status': 'success'};
      return ResponseBody.fromString(
        jsonEncode(responsePayload),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );
    });

    final syncEngine = SyncEngine(database, dio: dio);

    // 4. Run SyncEngine
    await syncEngine.triggerSync();

    expect(apiCalled, isTrue);

    // 5. Verify local database was updated
    final localRows = await database.select(database.sosIncidentsLocal).get();
    expect(localRows.single.isSynced, isTrue);

    final outboxRows = await database.select(database.outboxQueue).get();
    expect(outboxRows.single.status, 'sent');

    final batches = await database.select(database.syncBatchesLocal).get();
    expect(batches, hasLength(1));
    expect(batches.single.status, 'success');
  });
}
