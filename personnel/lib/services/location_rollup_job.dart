import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:workmanager/workmanager.dart';

import '../data/local/database.dart';
import '../data/repositories/location_repository.dart';
import '../data/repositories/sync_repository.dart';

/// Section 4 "Location batching" — configurable thresholds. Neither is
/// buried inline in the job logic below; change these two constants to
/// retune the rollup without hunting through the scheduler.
///
/// IMPORTANT CAVEAT (please read before relying on the WorkManager side of
/// this): Android's WorkManager enforces a hard 15-minute floor on
/// registerPeriodicTask — a shorter `frequency` is silently clamped up to
/// 15 minutes by the OS. I verified this against the workmanager package
/// docs; it isn't a guess. That means a genuine "every 2-5 minutes"
/// wall-clock rollup cannot be achieved through a WorkManager periodic
/// task alone. This file uses two triggers to give you the real ~2-5 min
/// behavior the build prompt asks for:
///   1. An in-app `Timer.periodic` (kRollupInterval), running whenever the
///      app process is alive — foreground or backgrounded but not killed.
///      This is the trigger that actually fires every few minutes.
///   2. A WorkManager periodic task (kWorkManagerBackstopInterval, floored
///      to 15 min by the OS regardless of what's passed here) as a
///      backstop, so a buffer that's been quietly filling while the app
///      was fully killed still gets rolled up eventually instead of
///      growing unbounded.
/// Point-count-based rollup (kRollupPointThreshold) is independent of
/// both timers and fires immediately from `LocationRepository` /
/// `LocationRollupScheduler.maybeRollupOnPing`, so it isn't affected by
/// this limitation either way.
const Duration kRollupInterval = Duration(minutes: 3);
const int kRollupPointThreshold = 50;
const Duration kWorkManagerBackstopInterval = Duration(minutes: 15);

const String kLocationRollupTaskName = 'polarops_location_rollup_backstop';
const String kLocationRollupTaskUniqueName = 'polarops_location_rollup_backstop_unique';

/// Top-level entry point WorkManager's native side calls into on Android
/// (and, if configured, iOS BGTaskScheduler) when the app isn't in the
/// foreground. Must stay top-level/static and keep this exact
/// `@pragma('vm:entry-point')` annotation — Flutter's AOT compiler will
/// tree-shake it out otherwise, and the native side would call into
/// nothing.
@pragma('vm:entry-point')
void locationRollupCallbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    if (task != kLocationRollupTaskName) return Future.value(true);
    try {
      final database = AppDatabase();
      final repository = LocationRepository(database, SyncRepository(database));
      await repository.rollupBuffer();
      await database.close();
      return true;
    } catch (_) {
      // Leave everything as-is and let WorkManager retry on its own
      // backoff policy rather than losing pings — a failed rollup attempt
      // just means the buffer keeps growing until the next attempt.
      return false;
    }
  });
}

/// Owns the in-app timer + point-count trigger for the location rollup.
/// One instance per app run; start it once (e.g. from main.dart) after the
/// database is ready.
class LocationRollupScheduler {
  LocationRollupScheduler(AppDatabase database)
      : _repository = LocationRepository(database, SyncRepository(database));

  final LocationRepository _repository;
  Timer? _timer;

  /// Starts the in-app periodic timer and, where supported, registers the
  /// WorkManager backstop task. Safe to call once at app start; idempotent
  /// registration on the WorkManager side (`ExistingPeriodicWorkPolicy`
  /// defaults to keeping the existing task rather than duplicating it —
  /// worth confirming against the installed workmanager version's docs if
  /// you see duplicate runs).
  ///
  /// PLATFORM NOTE: the `workmanager` package only ships native
  /// implementations for Android and iOS — there is no Windows/Linux/macOS
  /// desktop or web backend, so calling `Workmanager().initialize(...)` on
  /// those platforms throws `UnimplementedError` (or, on web, is simply
  /// unavailable). The in-app `Timer.periodic` above is the trigger that
  /// actually does the ~2-5 min rollup on every platform, including
  /// desktop; WorkManager here is *only* the "still roll up after the app
  /// process is killed" backstop described above, which is a mobile-only
  /// concept (desktop builds during dev don't need it). So: skip
  /// registration entirely on unsupported platforms rather than letting it
  /// throw and take the timer down with it.
  Future<void> start() async {
    _timer?.cancel();
    _timer = Timer.periodic(kRollupInterval, (_) => _repository.rollupBuffer());

    if (!_workManagerSupported) {
      debugPrint(
        'LocationRollupScheduler: workmanager has no implementation on '
        'this platform (desktop/web) — skipping the WorkManager backstop. '
        'The in-app timer (every ${kRollupInterval.inMinutes} min) still '
        'drives the rollup normally.',
      );
      return;
    }

    await Workmanager().initialize(locationRollupCallbackDispatcher);
    await Workmanager().registerPeriodicTask(
      kLocationRollupTaskUniqueName,
      kLocationRollupTaskName,
      frequency: kWorkManagerBackstopInterval,
    );
  }

  /// `workmanager` only has native backends for Android and iOS. `kIsWeb`
  /// is checked first since `Platform` throws on web.
  bool get _workManagerSupported =>
      !kIsWeb && (Platform.isAndroid || Platform.isIOS);

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  /// Call after every [LocationRepository.recordPing] so the point-count
  /// threshold is enforced independent of the timer.
  Future<void> maybeRollupOnPing() async {
    final count = await _repository.bufferedPingCount();
    if (count >= kRollupPointThreshold) {
      await _repository.rollupBuffer();
    }
  }
}
