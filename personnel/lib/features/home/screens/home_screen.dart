import 'package:flutter/material.dart';

import '../../../data/local/database.dart';
import '../../cargo_handling/screens/cargo_handling_screen.dart';
import '../../field_updates/screens/field_updates_screen.dart';
import '../../location_tracking/screens/location_tracking_screen.dart';
import '../../resource_usage/screens/resource_usage_screen.dart';
import '../../sos/screens/sos_screen.dart';

/// App shell shown once a device is provisioned. Field Updates (milestone
/// 2) and Location Updates (milestone 3) are wired up; the rest are
/// placeholder tiles per /docs/03_personnel_app_build_prompt.md, section
/// 3, and get wired in as their own milestones land.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.database});

  final AppDatabase database;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('PolarOps')),
      body: FutureBuilder<SelfProfileRow?>(
        future: database.getSelfProfile(),
        builder: (context, snapshot) {
          final profile = snapshot.data;
          if (profile == null) {
            return const Center(child: CircularProgressIndicator());
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Welcome, ${profile.fullName}', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 4),
              Text('${profile.role} · ${profile.stationId}', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 24),
              _FeatureTile(
                icon: Icons.assignment_outlined,
                title: 'Field Updates',
                subtitle: 'Daily activity, site conditions, notes',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => FieldUpdatesScreen(database: database)),
                ),
              ),
              _FeatureTile(
                icon: Icons.inventory_2_outlined,
                title: 'Cargo Handling',
                subtitle: 'Scan, upload, verify & confirm',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => CargoHandlingScreen(database: database)),
                ),
              ),
              _FeatureTile(
                icon: Icons.local_gas_station_outlined,
                title: 'Resource Usage',
                subtitle: 'Log fuel, power, and equipment',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => ResourceUsageScreen(database: database)),
                ),
              ),
              _FeatureTile(
                icon: Icons.location_on_outlined,
                title: 'Location Updates',
                subtitle: 'Background GPS batching',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => LocationTrackingScreen(database: database)),
                ),
              ),
              _FeatureTile(
                icon: Icons.emergency_outlined,
                title: 'SOS',
                subtitle: 'Trigger emergency distress alerts',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => SosScreen(database: database)),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Icon(icon, color: enabled ? null : Theme.of(context).disabledColor),
        title: Text(title, style: enabled ? null : TextStyle(color: Theme.of(context).disabledColor)),
        subtitle: Text(subtitle),
        trailing: enabled ? const Icon(Icons.chevron_right) : null,
        onTap: onTap,
        enabled: enabled,
      ),
    );
  }
}
