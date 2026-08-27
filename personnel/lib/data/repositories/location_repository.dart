import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../local/database.dart';
import 'sync_repository.dart';

/// Section 4 "Location batching". Two responsibilities, matching the two
/// table lifecycles in 03_mobile_app_schema.sql:
///
/// 1. [recordPing] — every raw GPS reading lands in `location_ping_buffer`
///    immediately. Never synced, never given an outbox entry directly.
/// 2. [rollupBuffer] — drains whatever is in the buffer into ONE
///    `location_tracks_local` row (JSON point array) and clears those
///    buffer rows. Only this rolled-up row gets an outbox entry — a busy
///    day produces a handful of outbox rows instead of hundreds of pings.
///
/// [rollupBuffer] is called from three places: [recordPing] itself once the
/// point-count threshold is crossed, the in-app timer in
/// `LocationRollupScheduler` (time-based trigger), and the WorkManager
/// backstop task for when the app isn't in the foreground. All three just
/// call this one method, so the rollup logic itself has exactly one
/// implementation.
class LocationRepository {
  LocationRepository(this._db, this._syncRepository);

  final AppDatabase _db;
  final SyncRepository _syncRepository;
  static const _uuid = Uuid();

  /// Guards [rollupBuffer] against concurrent execution. The timer in
  /// `LocationRollupScheduler` and the point-count check in
  /// `maybeRollupOnPing` can both call `rollupBuffer()` around the same
  /// moment; without this, two overlapping calls could each snapshot an
  /// overlapping set of buffer rows and each write their own
  /// `location_tracks_local` + outbox row — duplicate points shipped to
  /// the station server. Any caller that arrives while a rollup is
  /// already running gets back the SAME in-flight Future instead of
  /// starting a second one.
  Future<LocationTrackLocalRow?>? _inFlightRollup;

  Future<void> recordPing({
    required double latitude,
    required double longitude,
    double? accuracyM,
  }) async {
    await _db.into(_db.locationPingBuffer).insert(
          LocationPingBufferCompanion.insert(
            id: _uuid.v4(),
            latitude: latitude,
            longitude: longitude,
            accuracyM: Value(accuracyM),
          ),
        );
  }

  Future<int> bufferedPingCount() async {
    final countExp = _db.locationPingBuffer.id.count();
    final query = _db.selectOnly(_db.locationPingBuffer)..addColumns([countExp]);
    final row = await query.getSingle();
    return row.read(countExp) ?? 0;
  }

  Stream<int> watchBufferedPingCount() {
    final countExp = _db.locationPingBuffer.id.count();
    final query = _db.selectOnly(_db.locationPingBuffer)..addColumns([countExp]);
    return query.map((row) => row.read(countExp) ?? 0).watchSingle();
  }

  Stream<List<LocationTrackLocalRow>> watchRecentTracks({int limit = 20}) {
    return (_db.select(_db.locationTracksLocal)
          ..orderBy([(t) => OrderingTerm.desc(t.trackEndedAt)])
          ..limit(limit))
        .watch();
  }

  /// Drains the current buffer into one `location_tracks_local` row.
  ///
  /// Reads a snapshot of buffer rows first, then — inside the single
  /// transaction [SyncRepository.writeWithOutbox] opens — inserts the
  /// track row, the matching outbox row, AND deletes exactly the
  /// snapshotted buffer rows by id. Deleting by explicit id list (not a
  /// blanket "delete everything") means a ping that lands in the buffer
  /// after the snapshot is taken survives to the next rollup instead of
  /// being silently dropped or duplicated.
  ///
  /// Returns null if the buffer was empty (nothing to roll up).
  Future<LocationTrackLocalRow?> rollupBuffer() {
    final inFlight = _inFlightRollup;
    if (inFlight != null) return inFlight;

    final future = _rollupBufferLocked();
    _inFlightRollup = future;
    // Whatever the outcome, clear the guard once this attempt finishes so
    // the next call (timer tick, next threshold trip, etc.) can proceed.
    future.whenComplete(() => _inFlightRollup = null);
    return future;
  }

  Future<LocationTrackLocalRow?> _rollupBufferLocked() async {
    final bufferRows = await (_db.select(_db.locationPingBuffer)
          ..orderBy([(t) => OrderingTerm.asc(t.recordedAt)]))
        .get();

    if (bufferRows.isEmpty) return null;

    final trackId = _uuid.v4();
    final pointsPayload = bufferRows
        .map((p) => {
              'lat': p.latitude,
              'lng': p.longitude,
              'accuracy_m': p.accuracyM,
              'recorded_at': p.recordedAt,
            })
        .toList();
    final pointsJson = jsonEncode(pointsPayload);
    final trackStartedAt = bufferRows.first.recordedAt;
    final trackEndedAt = bufferRows.last.recordedAt;
    final bufferIds = bufferRows.map((p) => p.id).toList();

    await _syncRepository.writeWithOutbox(
      entityTable: 'location_tracks_local',
      entityId: trackId,
      operation: 'insert',
      priority: 'normal',
      payload: {
        'id': trackId,
        'points_json': pointsPayload,
        'point_count': bufferRows.length,
        'track_started_at': trackStartedAt,
        'track_ended_at': trackEndedAt,
      },
      writeLocalRow: () async {
        await _db.into(_db.locationTracksLocal).insert(
              LocationTracksLocalCompanion.insert(
                id: trackId,
                pointsJson: pointsJson,
                pointCount: bufferRows.length,
                trackStartedAt: trackStartedAt,
                trackEndedAt: trackEndedAt,
              ),
            );
        await (_db.delete(_db.locationPingBuffer)
              ..where((t) => t.id.isIn(bufferIds)))
            .go();
      },
    );

    return (await (_db.select(_db.locationTracksLocal)
          ..where((t) => t.id.equals(trackId)))
        .getSingle());
  }
}
