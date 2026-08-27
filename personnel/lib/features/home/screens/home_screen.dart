import 'package:flutter/material.dart';

import '../../../data/local/database.dart';

/// Placeholder app shell shown once a device is provisioned. Feature
/// screens (Field Updates, Cargo Handling, Resource Usage, Location,
/// SOS, Sync Status) land here in later milestones — see
/// /docs/03_personnel_app_build_prompt.md, section 3.
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
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Welcome, ${profile.fullName}', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text('${profile.role} · ${profile.stationId}'),
                const SizedBox(height: 24),
                const Text('Feature screens land here in later milestones.'),
              ],
            ),
          );
        },
      ),
    );
  }
}
