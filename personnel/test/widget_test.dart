import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:polarops_personnel_app/data/local/database.dart';
import 'package:polarops_personnel_app/main.dart';

void main() {
  testWidgets('App boot and routing test', (WidgetTester tester) async {
    final db = AppDatabase.withExecutor(NativeDatabase.memory());
    
    // Build our app and trigger a frame.
    await tester.pumpWidget(PolarOpsApp(database: db));

    // Initially it shows a progress indicator because it is checking self profile
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pumpAndSettle();

    // Since profile is empty, it should navigate to AuthScreen (setup/provisioning screen)
    expect(find.text('Set up this device'), findsWidgets);

    await db.close();
  });
}
