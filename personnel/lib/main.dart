// Entry point. Boots the Drift database, restores self_profile (offline
// login), starts the connectivity listener + sync engine + location
// rollup background jobs, then launches the app shell.
// See /docs/03_personnel_app_build_prompt.md for the full build spec.
import 'package:flutter/material.dart';

void main() {
  // TODO: initialize Drift DB, background jobs, then runApp(...)
  runApp(const PolarOpsApp());
}

class PolarOpsApp extends StatelessWidget {
  const PolarOpsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: 'PolarOps',
      home: Scaffold(body: Center(child: Text('PolarOps — TODO'))),
    );
  }
}
