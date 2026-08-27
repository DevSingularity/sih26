import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:polarops_personnel_app/data/local/database.dart';
import 'package:polarops_personnel_app/services/connectivity_service.dart';

class FakeConnectivity implements Connectivity {
  FakeConnectivity(this.results);

  final List<ConnectivityResult> results;

  @override
  Future<List<ConnectivityResult>> checkConnectivity() async {
    return results;
  }

  @override
  Stream<List<ConnectivityResult>> get onConnectivityChanged => Stream.value(results);
}

void main() {
  late AppDatabase database;

  setUp(() {
    database = AppDatabase.withExecutor(NativeDatabase.memory());
  });

  tearDown(() async {
    await database.close();
  });

  test('ConnectivityService returns offline when no connection', () async {
    final fakeConnectivity = FakeConnectivity([ConnectivityResult.none]);
    final service = ConnectivityService(database, connectivity: fakeConnectivity);

    final log = await service.check();

    expect(log.isOnline, isFalse);
    expect(log.linkType, 'none');
    expect(log.checkedAt, isNotEmpty);

    final dbLogs = await database.select(database.connectivityLog).get();
    expect(dbLogs, hasLength(1));
    expect(dbLogs.single.isOnline, isFalse);
    expect(dbLogs.single.linkType, 'none');
  });

  test('ConnectivityService returns wifi when connected to wifi', () async {
    final fakeConnectivity = FakeConnectivity([ConnectivityResult.wifi]);
    final service = ConnectivityService(database, connectivity: fakeConnectivity);

    final log = await service.check();

    expect(log.isOnline, isTrue);
    expect(log.linkType, 'wifi');

    final dbLogs = await database.select(database.connectivityLog).get();
    expect(dbLogs.single.isOnline, isTrue);
    expect(dbLogs.single.linkType, 'wifi');
  });

  test('ConnectivityService returns satellite for mobile/cellular connection', () async {
    final fakeConnectivity = FakeConnectivity([ConnectivityResult.mobile]);
    final service = ConnectivityService(database, connectivity: fakeConnectivity);

    final log = await service.check();

    expect(log.isOnline, isTrue);
    expect(log.linkType, 'satellite');

    final dbLogs = await database.select(database.connectivityLog).get();
    expect(dbLogs.single.isOnline, isTrue);
    expect(dbLogs.single.linkType, 'satellite');
  });
}
