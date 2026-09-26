import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:drift/drift.dart' hide Column;
import 'package:flutter_test/flutter_test.dart';

import 'package:polarops_personnel_app/data/local/database.dart';
import 'package:polarops_personnel_app/data/repositories/sync_repository.dart';
import 'package:polarops_personnel_app/services/connectivity_service.dart';
import 'package:polarops_personnel_app/services/sync_engine.dart';

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

class FakeConnectivityService extends ConnectivityService {
  FakeConnectivityService(super.db, {required this.isOnline});

  final bool isOnline;

  @override
  Future<ConnectivityLogRow> check() async {
    return ConnectivityLogRow(
      id: 1,
      isOnline: isOnline,
      linkType: isOnline ? 'wifi' : 'none',
      checkedAt: DateTime.now().toUtc().toIso8601String(),
    );
  }
}

void main() {
  late AppDatabase database;
  late SyncRepository syncRepository;

  setUp(() {
    database = AppDatabase.withExecutor(NativeDatabase.memory());
    syncRepository = SyncRepository(database);
  });

  tearDown(() async {
    await database.close();
  });

  test('SyncEngine flush immediately returns if device is offline', () async {
    final connectivity = FakeConnectivityService(database, isOnline: false);
    final syncEngine = SyncEngine(database, connectivity: connectivity);

    expect(syncEngine.status.value.phase, SyncPhase.idle);

    await syncEngine.flush();

    expect(syncEngine.status.value.phase, SyncPhase.offline);
  });

  test('SyncEngine flush transitions to backoff phase on network errors', () async {
    // 1. Provision the device
    await database.into(database.selfProfile).insert(
          const SelfProfileCompanion(
            id: Value('crew_1'),
            employeeCode: Value('EMP01'),
            fullName: Value('John'),
            role: Value('Role'),
            stationId: Value('MAITRI'),
            authTokenHash: Value('token'),
            deviceId: Value('device_uuid'),
          ),
        );

    // 2. Add pending outbox item
    await syncRepository.writeWithOutbox(
      writeLocalRow: () async {},
      entityTable: 'field_updates_local',
      entityId: 'update_1',
      operation: 'insert',
      payload: {},
    );

    // 3. Setup Dio with connection timeout/error
    final dio = Dio();
    dio.httpClientAdapter = FakeHttpClientAdapter((options) async {
      throw DioException(
        requestOptions: options,
        error: 'Network connection timeout',
        message: 'Timeout error simulation',
        type: DioExceptionType.connectionTimeout,
      );
    });

    final connectivity = FakeConnectivityService(database, isOnline: true);
    final syncEngine = SyncEngine(database, dio: dio, connectivity: connectivity);

    await syncEngine.flush();

    expect(syncEngine.status.value.phase, SyncPhase.backoff);
    expect(syncEngine.status.value.consecutiveFailures, 1);
    expect(syncEngine.status.value.lastError, contains('Timeout error simulation'));
  });

  test('SyncEngine processes partial outcomes correctly', () async {
    // 1. Provision the device
    await database.into(database.selfProfile).insert(
          const SelfProfileCompanion(
            id: Value('crew_1'),
            employeeCode: Value('EMP01'),
            fullName: Value('John'),
            role: Value('Role'),
            stationId: Value('MAITRI'),
            authTokenHash: Value('token'),
            deviceId: Value('device_uuid'),
          ),
        );

    // 2. Add two pending outbox items
    await syncRepository.writeWithOutbox(
      writeLocalRow: () async {
        await database.into(database.fieldUpdatesLocal).insert(
              FieldUpdatesLocalCompanion.insert(
                id: 'id_ok',
                updateType: 'daily_activity',
                content: 'test content',
              ),
            );
      },
      entityTable: 'field_updates_local',
      entityId: 'id_ok',
      operation: 'insert',
      payload: {},
    );
    await syncRepository.writeWithOutbox(
      writeLocalRow: () async {
        await database.into(database.fieldUpdatesLocal).insert(
              FieldUpdatesLocalCompanion.insert(
                id: 'id_fail',
                updateType: 'daily_activity',
                content: 'test content',
              ),
            );
      },
      entityTable: 'field_updates_local',
      entityId: 'id_fail',
      operation: 'insert',
      payload: {},
    );

    // 3. Setup Dio to accept one and reject one
    final dio = Dio();
    dio.httpClientAdapter = FakeHttpClientAdapter((options) async {
      final responsePayload = {
        'results': [
          {'entity_id': 'id_ok', 'status': 'accepted'},
          {'entity_id': 'id_fail', 'status': 'rejected', 'reason': 'Validation failed'}
        ]
      };
      return ResponseBody.fromString(
        jsonEncode(responsePayload),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );
    });

    final connectivity = FakeConnectivityService(database, isOnline: true);
    final syncEngine = SyncEngine(database, dio: dio, connectivity: connectivity);

    await syncEngine.flush();

    // Verify ok item is synced
    final okRow = await (database.select(database.fieldUpdatesLocal)..where((t) => t.id.equals('id_ok'))).getSingle();
    expect(okRow.isSynced, isTrue);

    // Verify failed item is still offline/unsynced
    final failRow = await (database.select(database.fieldUpdatesLocal)..where((t) => t.id.equals('id_fail'))).getSingle();
    expect(failRow.isSynced, isFalse);

    // Outbox states: ok is 'sent', failed is back to 'pending'
    final okOutbox = await (database.select(database.outboxQueue)..where((t) => t.entityId.equals('id_ok'))).getSingle();
    expect(okOutbox.status, 'sent');

    final failOutbox = await (database.select(database.outboxQueue)..where((t) => t.entityId.equals('id_fail'))).getSingle();
    expect(failOutbox.status, 'pending');
    expect(failOutbox.attemptCount, 1);
  });
}
