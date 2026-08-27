import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../local/database.dart';
import 'sync_repository.dart';

/// Repository for section 3 "Resource Usage". Manages resource consumption logs
/// (fuel, power, equipment usage) offline-first via SQLite and the outbox queue.
class ResourceUsageRepository {
  ResourceUsageRepository(this._db, this._syncRepository);

  final AppDatabase _db;
  final SyncRepository _syncRepository;
  static const _uuid = Uuid();

  /// Logs a resource usage and queues it in the sync outbox
  Future<void> createResourceUsage({
    required String resourceName,
    required String usageType,
    required double quantity,
    String? unit,
    String? notes,
  }) async {
    final id = _uuid.v4();
    final occurredAt = DateTime.now().toUtc().toIso8601String();

    await _syncRepository.writeWithOutbox(
      entityTable: 'resource_usage_local',
      entityId: id,
      operation: 'insert',
      priority: 'normal',
      payload: {
        'id': id,
        'resource_name': resourceName,
        'usage_type': usageType,
        'quantity': quantity,
        'unit': unit,
        'notes': notes,
        'occurred_at': occurredAt,
      },
      writeLocalRow: () => _db.into(_db.resourceUsageLocal).insert(
            ResourceUsageLocalCompanion.insert(
              id: id,
              resourceName: resourceName,
              usageType: usageType,
              quantity: quantity,
              unit: Value(unit),
              notes: Value(notes),
              occurredAt: Value(occurredAt),
            ),
          ),
    );
  }

  /// Streams recent resource usage logs (most recent first)
  Stream<List<ResourceUsageLocalRow>> watchRecent({int limit = 50}) {
    return (_db.select(_db.resourceUsageLocal)
          ..orderBy([(t) => OrderingTerm.desc(t.occurredAt)])
          ..limit(limit))
        .watch();
  }

  /// Streams the count of outbox rows pending sync for resource_usage_local
  Stream<int> watchPendingCount() {
    return _syncRepository.watchPendingCount('resource_usage_local');
  }
}
