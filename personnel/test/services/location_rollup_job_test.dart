import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:polarops_personnel_app/data/local/database.dart';
import 'package:polarops_personnel_app/data/repositories/location_repository.dart';
import 'package:polarops_personnel_app/data/repositories/sync_repository.dart';
import 'package:polarops_personnel_app/services/location_rollup_job.dart';

void main() {
  late AppDatabase database;
  late LocationRepository locationRepository;

  setUp(() {
    database = AppDatabase.withExecutor(NativeDatabase.memory());
    locationRepository = LocationRepository(database, SyncRepository(database));
  });

  tearDown(() async {
    await database.close();
  });

  test('LocationRollupScheduler does not roll up when below threshold', () async {
    final scheduler = LocationRollupScheduler(database);

    // Record 49 pings
    for (int i = 0; i < 49; i++) {
      await locationRepository.recordPing(
        latitude: -70.0 + i * 0.001,
        longitude: 11.0 + i * 0.001,
      );
    }

    expect(await locationRepository.bufferedPingCount(), 49);

    await scheduler.maybeRollupOnPing();

    // Still 49 in buffer
    expect(await locationRepository.bufferedPingCount(), 49);
    final tracks = await database.select(database.locationTracksLocal).get();
    expect(tracks, isEmpty);
  });

  test('LocationRollupScheduler rolls up when crossing threshold of 50 pings', () async {
    final scheduler = LocationRollupScheduler(database);

    // Record 50 pings
    for (int i = 0; i < 50; i++) {
      await locationRepository.recordPing(
        latitude: -70.0 + i * 0.001,
        longitude: 11.0 + i * 0.001,
      );
    }

    expect(await locationRepository.bufferedPingCount(), 50);

    await scheduler.maybeRollupOnPing();

    // Drained buffer to 0
    expect(await locationRepository.bufferedPingCount(), 0);
    final tracks = await database.select(database.locationTracksLocal).get();
    expect(tracks, hasLength(1));
    expect(tracks.single.pointCount, 50);

    final outbox = await database.select(database.outboxQueue).get();
    expect(outbox, hasLength(1));
    expect(outbox.single.entityTable, 'location_tracks_local');
  });
}
