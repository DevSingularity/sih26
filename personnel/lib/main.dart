// Entry point. Boots the Drift database, checks whether this device has
// already been provisioned (a `self_profile` row exists), and routes
// straight to the app shell if so — otherwise shows the one-time setup
// screen. Background jobs (sync engine, location rollup) are wired in
// starting milestone 3/4; see /docs/03_personnel_app_build_prompt.md.
import 'package:flutter/material.dart';

import 'data/local/database.dart';
import 'features/auth/screens/auth_screen.dart';
import 'features/home/screens/home_screen.dart';

void main() {
  final database = AppDatabase();
  runApp(PolarOpsApp(database: database));
}

class PolarOpsApp extends StatelessWidget {
  const PolarOpsApp({super.key, required this.database});

  final AppDatabase database;

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
          return provisioned ? HomeScreen(database: database) : AuthScreen(database: database);
        },
      ),
    );
  }
}
