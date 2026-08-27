// Reads connectivity_log (via ConnectivityService), batches pending
// outbox_queue rows (priority DESC, created_at ASC), POSTs to
// {station_base_url}/api/sync/push, marks accepted rows synced, retries
// with backoff on failure. 'immediate' (SOS) rows trigger an
// out-of-cycle flush attempt. See /docs/03_personnel_app_build_prompt.md,
// section 5.
//
// Milestone 4: wired against a *stubbed* /api/sync/push — see
// personnel/tool/mock_sync_server/ for a zero-dependency Node mock that
// speaks the request/response contract documented below. Swapping in
// teammate B's real station-server endpoint later (milestone 6) is just
// changing AppConfig.stationBaseUrl, as long as it speaks the same
// contract.
import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../config/app_config.dart';
import '../data/local/database.dart';
import '../data/repositories/sync_repository.dart';
import 'connectivity_service.dart';

/// What the persistent sync-status indicator (section 3) shows. Kept
/// separate from the raw outbox/connectivity tables so the UI has one
/// simple thing to listen to instead of stitching several streams
/// together itself.
enum SyncPhase { idle, checkingConnectivity, offline, flushing, backoff }

class SyncStatus {
  const SyncStatus({
    required this.phase,
    required this.lastAttemptAt,
    required this.lastSuccessAt,
    required this.lastError,
    required this.consecutiveFailures,
  });

  const SyncStatus.initial()
      : phase = SyncPhase.idle,
        lastAttemptAt = null,
        lastSuccessAt = null,
        lastError = null,
        consecutiveFailures = 0;

  final SyncPhase phase;
  final DateTime? lastAttemptAt;
  final DateTime? lastSuccessAt;
  final String? lastError;
  final int consecutiveFailures;

  SyncStatus copyWith({
    SyncPhase? phase,
    DateTime? lastAttemptAt,
    DateTime? lastSuccessAt,
    Object? lastError = _sentinel,
    int? consecutiveFailures,
  }) {
    return SyncStatus(
      phase: phase ?? this.phase,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      lastSuccessAt: lastSuccessAt ?? this.lastSuccessAt,
      lastError: identical(lastError, _sentinel) ? this.lastError : lastError as String?,
      consecutiveFailures: consecutiveFailures ?? this.consecutiveFailures,
    );
  }
}

const _sentinel = Object();

/// How often the normal flush loop runs when there's no backoff in
/// effect. Deliberately not "every few seconds" — this is meant to
/// respect a flaky/expensive link (build prompt: "don't hammer a flaky
/// satellite link with tight retries"), and anything urgent (SOS) skips
/// this loop entirely via [SyncEngine.triggerImmediateFlush].
const Duration kFlushInterval = Duration(seconds: 20);

/// Exponential backoff after consecutive failed flush attempts, capped so
/// a long outage still gets retried at a sane cadence instead of trying
/// forever at the base interval.
const Duration kBackoffBase = Duration(seconds: 20);
const Duration kBackoffCap = Duration(minutes: 5);

/// Max outbox rows sent in a single POST — keeps request bodies (and any
/// one photo-attachment-heavy batch) bounded.
const int kMaxBatchSize = 50;

class SyncEngine {
  SyncEngine(this._db, {Dio? dio, ConnectivityService? connectivity})
      : _syncRepository = SyncRepository(_db),
        _connectivity = connectivity ?? ConnectivityService(_db),
        _dio = dio ?? Dio(BaseOptions(
          connectTimeout: const Duration(seconds: 15),
          sendTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 15),
        ));

  final AppDatabase _db;
  final SyncRepository _syncRepository;
  final ConnectivityService _connectivity;
  final Dio _dio;
  static const _uuid = Uuid();

  Timer? _timer;
  DateTime? _backoffUntil;
  bool _flushInFlight = false;

  final ValueNotifier<SyncStatus> status = ValueNotifier(const SyncStatus.initial());

  /// Starts the periodic flush loop. Safe to call once at app start,
  /// after the database is ready (see main.dart). An immediate flush
  /// attempt is made right away rather than waiting out the first
  /// interval, so "go online" is reflected promptly.
  void start() {
    _timer?.cancel();
    _timer = Timer.periodic(kFlushInterval, (_) => flush());
    unawaited(flush());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  /// SOS (and anything else tagged `priority = 'immediate'`) calls this
  /// right after enqueueing, in addition to relying on the next normal
  /// flush if this attempt doesn't succeed (build prompt section 3/5).
  /// Bypasses the backoff cooldown — an SOS report is worth a link
  /// attempt even mid-backoff — but still only actually sends if
  /// connectivity is present.
  void triggerImmediateFlush() {
    unawaited(flush(bypassBackoff: true));
  }

  /// One flush attempt: check connectivity, grab a batch, POST it, apply
  /// results. Concurrency-guarded the same way
  /// `LocationRepository.rollupBuffer` is — a second caller (e.g. the
  /// timer tick landing right as an SOS-triggered flush is mid-flight)
  /// just no-ops instead of racing it.
  Future<void> flush({bool bypassBackoff = false}) async {
    if (_flushInFlight) return;
    if (!bypassBackoff && _backoffUntil != null && DateTime.now().isBefore(_backoffUntil!)) {
      status.value = status.value.copyWith(phase: SyncPhase.backoff);
      return;
    }

    _flushInFlight = true;
    try {
      await _flushOnce();
    } finally {
      _flushInFlight = false;
    }
  }

  Future<void> _flushOnce() async {
    status.value = status.value.copyWith(
      phase: SyncPhase.checkingConnectivity,
      lastAttemptAt: DateTime.now(),
    );

    final connectivity = await _connectivity.check();
    if (!connectivity.isOnline) {
      status.value = status.value.copyWith(phase: SyncPhase.offline);
      return;
    }

    final batch = await _syncRepository.fetchPendingBatch(limit: kMaxBatchSize);
    if (batch.isEmpty) {
      _resetBackoff();
      status.value = status.value.copyWith(phase: SyncPhase.idle, lastError: null);
      return;
    }

    status.value = status.value.copyWith(phase: SyncPhase.flushing);
    await _syncRepository.markSending(batch.map((r) => r.outboxId).toList());

    final selfProfile = await _db.getSelfProfile();
    final batchId = _uuid.v4();
    await _syncRepository.recordBatchStarted(batchId: batchId, recordCount: batch.length);

    try {
      final response = await _dio.post<Map<String, Object?>>(
        '${AppConfig.stationBaseUrl}/api/sync/push',
        options: Options(
          headers: {
            if (selfProfile?.authTokenHash != null)
              'Authorization': 'Bearer ${selfProfile!.authTokenHash}',
          },
          contentType: 'application/json',
        ),
        data: {
          'device_id': selfProfile?.deviceId,
          'batch_id': batchId,
          'records': batch
              .map((r) => {
                    'entity_table': r.entityTable,
                    'entity_id': r.entityId,
                    'operation': r.operation,
                    'payload': r.payload,
                  })
              .toList(),
        },
      );

      final results = (response.data?['results'] as List?) ?? const [];
      final resultByEntityId = <String, String>{
        for (final r in results)
          (r as Map)['entity_id'] as String: r['status'] as String? ?? 'rejected',
      };

      var acceptedCount = 0;
      for (final record in batch) {
        final outcome = resultByEntityId[record.entityId] ?? 'rejected';
        if (outcome == 'accepted') {
          await _syncRepository.markAccepted(record);
          acceptedCount++;
        } else {
          final reasonEntry = results.cast<Map>().firstWhere(
                (r) => r['entity_id'] == record.entityId,
                orElse: () => const {},
              );
          await _syncRepository.markPendingRetry(
            record.outboxId,
            reason: reasonEntry['reason'] as String? ?? 'not accepted by station server',
          );
        }
      }

      await _syncRepository.recordBatchCompleted(batchId, success: true);
      _resetBackoff();
      status.value = status.value.copyWith(
        phase: SyncPhase.idle,
        lastSuccessAt: DateTime.now(),
        lastError: acceptedCount == batch.length
            ? null
            : '$acceptedCount/${batch.length} accepted this batch',
      );
    } on DioException catch (e) {
      // No response, timeout, or 5xx: leave everything pending and back
      // off rather than hammering the link. A 4xx (bad request on our
      // side) still lands here — it's still "the batch didn't go
      // through," and the row stays pending for a human to notice via
      // repeated failures rather than being silently dropped.
      for (final record in batch) {
        await _syncRepository.markPendingRetry(record.outboxId, reason: e.message);
      }
      await _syncRepository.recordBatchCompleted(batchId, success: false);
      _applyBackoff();
      status.value = status.value.copyWith(
        phase: SyncPhase.backoff,
        lastError: e.message ?? e.toString(),
        consecutiveFailures: _consecutiveFailures,
      );
    }
  }

  int _consecutiveFailures = 0;

  void _applyBackoff() {
    _consecutiveFailures++;
    final multiplier = 1 << (_consecutiveFailures - 1).clamp(0, 10); // 1,2,4,8...
    final delay = kBackoffBase * multiplier.toDouble();
    final capped = delay > kBackoffCap ? kBackoffCap : delay;
    _backoffUntil = DateTime.now().add(capped);
  }

  void _resetBackoff() {
    _consecutiveFailures = 0;
    _backoffUntil = null;
  }

  /// Exposed for the sync-status screen's "pending outbox rows" count and
  /// "recent batches" list.
  SyncRepository get repository => _syncRepository;
  ConnectivityService get connectivity => _connectivity;

  void dispose() {
    stop();
    _dio.close();
    status.dispose();
  }
}
