import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'tables/self_profile.dart';
import 'tables/personnel_cache.dart';
import 'tables/expedition_cache.dart';
import 'tables/cargo_items_local.dart';
import 'tables/resource_usage_local.dart';
import 'tables/field_updates_local.dart';
import 'tables/location_ping_buffer.dart';
import 'tables/location_tracks_local.dart';
import 'tables/sos_incidents_local.dart';
import 'tables/outbox_queue.dart';
import 'tables/sync_batches_local.dart';
import 'tables/connectivity_log.dart';

part 'database.g.dart';

/// The on-device SQLite database. Every table here mirrors one
/// `CREATE TABLE` in `/schemas/03_mobile_app_schema.sql` table-for-table —
/// see that file for the authoritative column-level spec (types,
/// nullability, CHECK constraints, defaults). This is the single source of
/// truth on the device; nothing in this app waits on a network call before
/// a write is considered "saved".
@DriftDatabase(tables: [
  SelfProfile,
  PersonnelCache,
  ExpeditionCache,
  CargoItemsLocal,
  ResourceUsageLocal,
  FieldUpdatesLocal,
  LocationPingBuffer,
  LocationTracksLocal,
  SosIncidentsLocal,
  OutboxQueue,
  SyncBatchesLocal,
  ConnectivityLog,
])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  /// Test/alternate-connection constructor (e.g. an in-memory executor for
  /// unit tests), so screens and repositories never need to know how the
  /// underlying connection was created.
  AppDatabase.withExecutor(super.executor);

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (Migrator m) async {
          await m.createAll();
        },
      );

  /// Convenience accessor used by the provisioning flow and by app start-up
  /// to decide "has this device already been set up?" — a null result
  /// means the app must show the provisioning screen before anything else.
  Future<SelfProfileRow?> getSelfProfile() {
    return select(selfProfile).getSingleOrNull();
  }
}

LazyDatabase _openConnection() {
  // Lazy so the actual sqlite3 file isn't opened until the first query,
  // which keeps app start-up fast and keeps this file testable without a
  // real filesystem.
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'polarops_personnel.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
