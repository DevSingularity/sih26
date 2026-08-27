import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../data/local/database.dart';

/// SyncEngine handles flushing the [outbox_queue] items to the Maitri station server.
/// 'immediate' (SOS) rows trigger an out-of-cycle flush attempt.
class SyncEngine {
  SyncEngine(this._db, {Dio? dio, String? baseUrl})
      : _dio = dio ?? Dio(),
        _baseUrl = baseUrl ?? 'http://10.0.2.2:3000';

  final AppDatabase _db;
  final Dio _dio;
  final String _baseUrl;
  static const _uuid = Uuid();
  bool _isSyncing = false;

  /// Performs a sync push of all pending records.
  Future<void> triggerSync() async {
    if (_isSyncing) return;
    _isSyncing = true;
    try {
      await _flushQueue();
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _flushQueue() async {
    // 1. Consult connectivity status if a connectivity log exists
    final latestLog = await (_db.select(_db.connectivityLog)
          ..orderBy([(t) => OrderingTerm.desc(t.checkedAt)])
          ..limit(1))
        .getSingleOrNull();

    if (latestLog != null && !latestLog.isOnline) {
      return;
    }

    // 2. Fetch pending records. Priority 'immediate' first, then 'normal'.
    final pendingRecords = await (_db.select(_db.outboxQueue)
          ..where((t) => t.status.equals('pending'))
          ..orderBy([
            (t) => OrderingTerm(expression: t.priority, mode: OrderingMode.desc),
            (t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.asc)
          ]))
        .get();

    if (pendingRecords.isEmpty) return;

    // Get the profile to access device credentials
    final profile = await _db.getSelfProfile();
    if (profile == null) return;

    final batchId = _uuid.v4();
    final now = DateTime.now().toUtc().toIso8601String();

    // Log the sync attempt
    await _db.into(_db.syncBatchesLocal).insert(
          SyncBatchesLocalCompanion.insert(
            id: batchId,
            recordCount: pendingRecords.length,
            startedAt: Value(now),
            status: const Value('in_progress'),
          ),
        );

    // Prepare JSON records for serialization
    final recordsJson = pendingRecords.map((r) {
      return {
        'entity_table': r.entityTable,
        'entity_id': r.entityId,
        'operation': r.operation,
        'payload': jsonDecode(r.payloadJson),
      };
    }).toList();

    // Move outbox records to 'sending' status
    for (final r in pendingRecords) {
      await (_db.update(_db.outboxQueue)..where((t) => t.id.equals(r.id)))
          .write(const OutboxQueueCompanion(status: Value('sending')));
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '$_baseUrl/api/sync/push',
        data: {
          'device_id': profile.deviceId,
          'batch_id': batchId,
          'records': recordsJson,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer ${profile.authTokenHash ?? ""}',
            'Content-Type': 'application/json',
          },
          sendTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        ),
      );

      if (response.statusCode == 200) {
        await _db.transaction(() async {
          for (final r in pendingRecords) {
            try {
              // Update source table is_synced flag
              await _db.customUpdate(
                'UPDATE ${r.entityTable} SET is_synced = 1 WHERE id = ?',
                variables: [Variable(r.entityId)],
              );
            } catch (_) {
              // Handle tables without is_synced safely
            }

            // Mark outbox row as sent
            await (_db.update(_db.outboxQueue)..where((t) => t.id.equals(r.id)))
                .write(const OutboxQueueCompanion(status: Value('sent')));
          }

          // Complete the sync batch
          await (_db.update(_db.syncBatchesLocal)..where((t) => t.id.equals(batchId)))
              .write(SyncBatchesLocalCompanion(
                status: const Value('success'),
                completedAt: Value(DateTime.now().toUtc().toIso8601String()),
              ));
        });
      } else {
        throw DioException(
          requestOptions: response.requestOptions,
          response: response,
          type: DioExceptionType.badResponse,
        );
      }
    } catch (e) {
      final nowErr = DateTime.now().toUtc().toIso8601String();
      await _db.transaction(() async {
        for (final r in pendingRecords) {
          await (_db.update(_db.outboxQueue)..where((t) => t.id.equals(r.id)))
              .write(OutboxQueueCompanion(
                status: const Value('pending'),
                attemptCount: Value(r.attemptCount + 1),
                lastAttemptAt: Value(nowErr),
              ));
        }

        await (_db.update(_db.syncBatchesLocal)..where((t) => t.id.equals(batchId)))
            .write(SyncBatchesLocalCompanion(
              status: const Value('failed'),
              completedAt: Value(nowErr),
            ));
      });
    }
  }
}
