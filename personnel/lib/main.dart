// Entry point. Boots the Drift database, checks whether this device has
// already been provisioned (a `self_profile` row exists), and routes
// straight to the app shell if so — otherwise shows the one-time setup
// screen. Background jobs (sync engine, location rollup) are wired in
// starting milestone 3/4; see /docs/03_personnel_app_build_prompt.md.
import 'package:flutter/material.dart';

import 'data/local/database.dart';
import 'features/auth/screens/auth_screen.dart';
import 'features/home/screens/home_screen.dart';
import 'services/sync_engine.dart';

void main() {
  final database = AppDatabase();
  final syncEngine = SyncEngine(database)..start();
  runApp(PolarOpsApp(database: database, syncEngine: syncEngine));
}

class PolarOpsApp extends StatelessWidget {
  const PolarOpsApp({super.key, required this.database, required this.syncEngine});

  final AppDatabase database;
  final SyncEngine syncEngine;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PolarOps',
      home: FutureBuilder<SelfProfileRow?>(
        future: database.getSelfProfile(),
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Scaffold(body: Center(child: CircularProgressIndicator()));
          }
          final provisioned = snapshot.data != null;
          return provisioned
              ? HomeScreen(database: database, syncEngine: syncEngine)
              : AuthScreen(database: database, syncEngine: syncEngine);
        },
      ),
    );
  }
}
