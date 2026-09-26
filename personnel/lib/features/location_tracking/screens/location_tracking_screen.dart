import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../../../data/local/database.dart';
import '../../../data/repositories/location_repository.dart';
import '../../../data/repositories/sync_repository.dart';
import '../../../services/location_rollup_job.dart';

/// Section 3 "Location Updates" + section 4 "Location batching". Every raw
/// reading (real GPS or, for testing without a device/GPS fix, the
/// "Simulate movement" button below) goes through
/// [LocationRepository.recordPing] into `location_ping_buffer` — never
/// synced directly. [LocationRollupScheduler] handles turning that buffer
/// into `location_tracks_local` rows on its own timers; this screen never
/// calls rollupBuffer() itself except via the manual "Roll up now" button,
/// which exists purely so milestone 3 can be verified without waiting
/// out kRollupInterval.
class LocationTrackingScreen extends StatefulWidget {
  const LocationTrackingScreen({super.key, required this.database});

  final AppDatabase database;

  @override
  State<LocationTrackingScreen> createState() => _LocationTrackingScreenState();
}

class _LocationTrackingScreenState extends State<LocationTrackingScreen> {
  late final LocationRepository _repository;
  late final LocationRollupScheduler _scheduler;

  StreamSubscription<Position>? _positionSubscription;
  bool _tracking = false;
  String? _error;
  final _random = Random();

  @override
  void initState() {
    super.initState();
    _repository = LocationRepository(widget.database, SyncRepository(widget.database));
    _scheduler = LocationRollupScheduler(widget.database);
    _scheduler.start().catchError((Object e) {
      if (mounted) {
        setState(() => _error =
            'Background rollup scheduling failed to start: $e. In-app tracking and manual roll-up still work.');
      }
    });
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _scheduler.stop();
    super.dispose();
  }

  Future<bool> _ensurePermission() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      setState(() => _error = 'Location services are off on this device.');
      return false;
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      setState(() => _error = 'Location permission was not granted.');
      return false;
    }
    return true;
  }

  Future<void> _startTracking() async {
    setState(() => _error = null);
    if (!await _ensurePermission()) return;

    final locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // meters
    );

    setState(() => _tracking = true);
    _positionSubscription =
        Geolocator.getPositionStream(locationSettings: locationSettings).listen(
      (position) async {
        await _repository.recordPing(
          latitude: position.latitude,
          longitude: position.longitude,
          accuracyM: position.accuracy,
        );
        await _scheduler.maybeRollupOnPing();
      },
      onError: (Object e) {
        if (mounted) setState(() => _error = 'Location stream error: $e');
      },
    );
  }

  void _stopTracking() {
    _positionSubscription?.cancel();
    _positionSubscription = null;
    setState(() => _tracking = false);
  }

  /// Feeds a handful of synthetic pings straight into the buffer, no GPS
  /// fix or device required. This is the fastest way to verify milestone
  /// 3 end-to-end: press this a few times, watch "Buffered pings" climb,
  /// then either wait for kRollupInterval or press "Roll up now" and watch
  /// a row appear under Recent tracks.
  Future<void> _simulateMovement() async {
    // Roughly Maitri station's coordinates, Antarctica — nudged slightly
    // per ping so points_json isn't just one repeated point.
    const baseLat = -70.7658;
    const baseLng = 11.7333;
    for (var i = 0; i < 5; i++) {
      await _repository.recordPing(
        latitude: baseLat + (_random.nextDouble() - 0.5) * 0.001,
        longitude: baseLng + (_random.nextDouble() - 0.5) * 0.001,
        accuracyM: 5 + _random.nextDouble() * 10,
      );
      await Future<void>.delayed(const Duration(milliseconds: 50));
    }
    await _scheduler.maybeRollupOnPing();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Location Updates')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(_tracking ? Icons.gps_fixed : Icons.gps_off,
                          color: _tracking ? Colors.green : null),
                      const SizedBox(width: 8),
                      Text(_tracking ? 'Tracking' : 'Not tracking',
                          style: Theme.of(context).textTheme.titleMedium),
                    ],
                  ),
                  const SizedBox(height: 8),
                  StreamBuilder<int>(
                    stream: _repository.watchBufferedPingCount(),
                    builder: (context, snapshot) =>
                        Text('Buffered pings (not yet rolled up): ${snapshot.data ?? 0}'),
                  ),
                  Text(
                    'Rolls up every ${kRollupInterval.inMinutes} min or '
                    '$kRollupPointThreshold points, whichever is first.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilledButton.icon(
                        onPressed: _tracking ? _stopTracking : _startTracking,
                        icon: Icon(_tracking ? Icons.stop : Icons.play_arrow),
                        label: Text(_tracking ? 'Stop tracking' : 'Start tracking'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _simulateMovement,
                        icon: const Icon(Icons.directions_walk),
                        label: const Text('Simulate movement'),
                      ),
                      OutlinedButton.icon(
                        onPressed: () => _repository.rollupBuffer(),
                        icon: const Icon(Icons.merge_type),
                        label: const Text('Roll up now'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text('Recent tracks', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          StreamBuilder<List<LocationTrackLocalRow>>(
            stream: _repository.watchRecentTracks(),
            builder: (context, snapshot) {
              final tracks = snapshot.data ?? const [];
              if (tracks.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(child: Text('No rolled-up tracks yet.')),
                );
              }
              return Column(
                children: tracks
                    .map((t) => Card(
                          child: ListTile(
                            leading: Icon(
                              t.isSynced ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
                            ),
                            title: Text('${t.pointCount} points'),
                            subtitle: Text('${t.trackStartedAt} → ${t.trackEndedAt}'),
                          ),
                        ))
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
