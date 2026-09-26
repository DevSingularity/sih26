import 'package:flutter/material.dart';

import '../../../data/local/database.dart';
import '../../../services/sync_engine.dart';

class SyncStatusScreen extends StatelessWidget {
  const SyncStatusScreen({super.key, required this.syncEngine});

  final SyncEngine syncEngine;

  Color _getPhaseColor(SyncPhase phase) {
    switch (phase) {
      case SyncPhase.idle:
        return Colors.blue.shade600;
      case SyncPhase.checkingConnectivity:
        return Colors.purple.shade600;
      case SyncPhase.offline:
        return Colors.grey.shade600;
      case SyncPhase.flushing:
        return Colors.green.shade600;
      case SyncPhase.backoff:
        return Colors.amber.shade700;
    }
  }

  String _getPhaseLabel(SyncPhase phase) {
    switch (phase) {
      case SyncPhase.idle:
        return 'Idle (Up to date)';
      case SyncPhase.checkingConnectivity:
        return 'Checking Link...';
      case SyncPhase.offline:
        return 'Device Offline';
      case SyncPhase.flushing:
        return 'Syncing Outbox...';
      case SyncPhase.backoff:
        return 'Backing off / Cooling down';
    }
  }

  IconData _getPhaseIcon(SyncPhase phase) {
    switch (phase) {
      case SyncPhase.idle:
        return Icons.check_circle_outline;
      case SyncPhase.checkingConnectivity:
        return Icons.swap_vertical_circle_outlined;
      case SyncPhase.offline:
        return Icons.cloud_off_outlined;
      case SyncPhase.flushing:
        return Icons.cloud_upload_outlined;
      case SyncPhase.backoff:
        return Icons.hourglass_empty_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Outbox & Sync Status'),
      ),
      body: ValueListenableBuilder<SyncStatus>(
        valueListenable: syncEngine.status,
        builder: (context, status, _) {
          final phaseColor = _getPhaseColor(status.phase);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            key: const Key('sync_status_form'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Phase Status Card
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      gradient: LinearGradient(
                        colors: [phaseColor.withValues(alpha: 0.1), phaseColor.withValues(alpha: 0.02)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: Column(
                      children: [
                        Icon(_getPhaseIcon(status.phase), size: 48, color: phaseColor),
                        const SizedBox(height: 12),
                        Text(
                          _getPhaseLabel(status.phase),
                          style: theme.textTheme.headlineSmall?.copyWith(
                            color: phaseColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        StreamBuilder<int>(
                          stream: syncEngine.repository.watchTotalPendingCount(),
                          builder: (context, pendingSnapshot) {
                            final pendingCount = pendingSnapshot.data ?? 0;
                            return Text(
                              '$pendingCount records pending local outbox',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: status.phase == SyncPhase.flushing
                              ? null
                              : () => syncEngine.flush(bypassBackoff: true),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: phaseColor,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                          icon: const Icon(Icons.sync),
                          label: const Text('Force Sync Now'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Metadata details
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        _buildDetailRow(
                          'Last Sync Attempt',
                          status.lastAttemptAt?.toLocal().toString().split('.').first ?? 'Never',
                        ),
                        const Divider(),
                        _buildDetailRow(
                          'Last Successful Sync',
                          status.lastSuccessAt?.toLocal().toString().split('.').first ?? 'Never',
                        ),
                        const Divider(),
                        _buildDetailRow(
                          'Consecutive Failures',
                          '${status.consecutiveFailures}',
                        ),
                        if (status.lastError != null) ...[
                          const Divider(),
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Text(
                              'Last Error: ${status.lastError}',
                              style: TextStyle(color: Colors.red.shade900, fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Recent Sync Batches Header
                Text(
                  'Recent Sync Batches',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),

                // List of recent batches
                StreamBuilder<List<SyncBatchLocalRow>>(
                  stream: syncEngine.repository.watchRecentBatches(),
                  builder: (context, snapshot) {
                    final batches = snapshot.data ?? [];
                    if (batches.isEmpty) {
                      return const Card(
                        child: Padding(
                          padding: EdgeInsets.all(24.0),
                          child: Center(
                            child: Text(
                              'No sync attempts recorded.',
                              style: TextStyle(color: Colors.grey),
                            ),
                          ),
                        ),
                      );
                    }

                    return Column(
                      children: batches.map((batch) {
                        final isSuccess = batch.status == 'success';
                        final isFailed = batch.status == 'failed';
                        final color = isSuccess
                            ? Colors.green
                            : isFailed
                                ? Colors.red
                                : Colors.blue;

                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: color.withValues(alpha: 0.1),
                              child: Icon(
                                isSuccess
                                    ? Icons.check
                                    : isFailed
                                        ? Icons.close
                                        : Icons.sync,
                                color: color,
                              ),
                            ),
                            title: Text('Batch: ${batch.id.substring(0, 8)}...'),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${batch.recordCount} records flushed'),
                                Text(
                                  'Started: ${batch.startedAt}',
                                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                                if (batch.completedAt != null)
                                  Text(
                                    'Completed: ${batch.completedAt}',
                                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                                  ),
                              ],
                            ),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                batch.status.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: color,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    );
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.w500)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
