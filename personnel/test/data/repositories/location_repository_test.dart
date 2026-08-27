import 'dart:convert';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:polarops_personnel_app/data/local/database.dart';
import 'package:polarops_personnel_app/data/repositories/location_repository.dart';
import 'package:polarops_personnel_app/data/repositories/sync_repository.dart';

void main() {
  late AppDatabase database;
  late LocationRepository repository;

  setUp(() {
    database = AppDatabase.withExecutor(NativeDatabase.memory());
    repository = LocationRepository(database, SyncRepository(database));
  });

  tearDown(() async {
    await database.close();
  });

  test('recordPing only writes to the buffer — no outbox row, per build prompt section 4',
      () async {
    await repository.recordPing(latitude: -70.76, longitude: 11.73, accuracyM: 5);

    final bufferRows = await database.select(database.locationPingBuffer).get();
    expect(bufferRows, hasLength(1));

    final outboxRows = await database.select(database.outboxQueue).get();
    expect(outboxRows, isEmpty);
  });

  test('rollupBuffer on an empty buffer returns null and writes nothing', () async {
    final result = await repository.rollupBuffer();
    expect(result, isNull);

    final tracks = await database.select(database.locationTracksLocal).get();
    expect(tracks, isEmpty);
  });

  test('rollupBuffer drains the buffer into one track row with one outbox entry', () async {
    await repository.recordPing(latitude: -70.760, longitude: 11.730, accuracyM: 5);
    await repository.recordPing(latitude: -70.761, longitude: 11.731, accuracyM: 6);
    await repository.recordPing(latitude: -70.762, longitude: 11.732, accuracyM: 4);

    final track = await repository.rollupBuffer();
    expect(track, isNotNull);
    expect(track!.pointCount, 3);
    expect(track.isSynced, isFalse);

    final points = (jsonDecode(track.pointsJson) as List).cast<Map<String, dynamic>>();
    expect(points, hasLength(3));
    expect(points.first['lat'], -70.760);

    // Buffer should be fully drained.
    final bufferRows = await database.select(database.locationPingBuffer).get();
    expect(bufferRows, isEmpty);

    // Exactly one track row, one outbox row, and the outbox row points at
    // location_tracks_local — never at the individual pings.
    final tracks = await database.select(database.locationTracksLocal).get();
    expect(tracks, hasLength(1));

    final outboxRows = await database.select(database.outboxQueue).get();
    expect(outboxRows, hasLength(1));
    expect(outboxRows.single.entityTable, 'location_tracks_local');
    expect(outboxRows.single.entityId, track.id);

    final payload = jsonDecode(outboxRows.single.payloadJson) as Map<String, dynamic>;
    expect(payload['point_count'], 3);
  });

  test('a ping recorded after the rollup snapshot survives into the next rollup', () async {
    await repository.recordPing(latitude: -70.760, longitude: 11.730);
    final firstTrack = await repository.rollupBuffer();
    expect(firstTrack!.pointCount, 1);

    // Simulates a ping landing just after rollupBuffer snapshotted the
    // buffer — it should not be swept up by the first rollup, but should
    // still be present for the next one (i.e. never silently dropped).
    await repository.recordPing(latitude: -70.761, longitude: 11.731);
    final bufferRows = await database.select(database.locationPingBuffer).get();
    expect(bufferRows, hasLength(1));

    final secondTrack = await repository.rollupBuffer();
    expect(secondTrack!.pointCount, 1);

    final allTracks = await database.select(database.locationTracksLocal).get();
    expect(allTracks, hasLength(2));
  });

  test('watchBufferedPingCount reflects inserts and clears after rollup', () async {
    final counts = <int>[];
    final sub = repository.watchBufferedPingCount().listen(counts.add);

    await Future<void>.delayed(Duration.zero);
    expect(counts.last, 0);

    await repository.recordPing(latitude: -70.76, longitude: 11.73);
    await repository.recordPing(latitude: -70.77, longitude: 11.74);
    await Future<void>.delayed(Duration.zero);
    expect(counts.last, 2);

    await repository.rollupBuffer();
    await Future<void>.delayed(Duration.zero);
    expect(counts.last, 0);

    await sub.cancel();
  });
}
