import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../local/database.dart';
import 'sync_repository.dart';

/// Repository for SOS emergency incident reporting.
/// Writes to local SQLite and immediately enqueues with 'immediate' priority.
class SosRepository {
  SosRepository(this._db, this._syncRepository);

  final AppDatabase _db;
  final SyncRepository _syncRepository;
  static const _uuid = Uuid();

  /// Creates a new SOS incident locally and enqueues it with 'immediate' priority.
  Future<void> createSosIncident({
    required String incidentType,
    required String severity,
    String? description,
    double? latitude,
    double? longitude,
  }) async {
    final id = _uuid.v4();
    final reportedAt = DateTime.now().toUtc().toIso8601String();

    await _syncRepository.writeWithOutbox(
      entityTable: 'sos_incidents_local',
      entityId: id,
      operation: 'insert',
      priority: 'immediate',
      payload: {
        'id': id,
        'incident_type': incidentType,
        'description': description,
        'severity': severity,
        'latitude': latitude,
        'longitude': longitude,
        'status': 'reported',
        'reported_at': reportedAt,
      },
      writeLocalRow: () => _db.into(_db.sosIncidentsLocal).insert(
            SosIncidentsLocalCompanion.insert(
              id: id,
              incidentType: incidentType,
              severity: severity,
              description: Value(description),
              latitude: Value(latitude),
              longitude: Value(longitude),
              status: const Value('reported'),
              reportedAt: Value(reportedAt),
            ),
          ),
    );
  }

  /// Streams recent SOS incidents (most recent first)
  Stream<List<SosIncidentLocalRow>> watchRecent({int limit = 50}) {
    return (_db.select(_db.sosIncidentsLocal)
          ..orderBy([(t) => OrderingTerm.desc(t.reportedAt)])
          ..limit(limit))
        .watch();
  }

  /// Streams the count of outbox rows pending sync for sos_incidents_local
  Stream<int> watchPendingCount() {
    return _syncRepository.watchPendingCount('sos_incidents_local');
  }
}
