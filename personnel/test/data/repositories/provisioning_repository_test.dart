import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:polarops_personnel_app/data/local/database.dart';
import 'package:polarops_personnel_app/data/repositories/provisioning_repository.dart';

void main() {
  late AppDatabase database;
  late ProvisioningRepository repository;

  setUp(() {
    database = AppDatabase.withExecutor(NativeDatabase.memory());
    repository = ProvisioningRepository(database);
  });

  tearDown(() async {
    await database.close();
  });

  group('ProvisioningInput QR payload parsing', () {
    test('parses standard QR payload correctly', () {
      final rawPayload = jsonEncode({
        'id': 'personnel_123',
        'employee_code': 'EMP99',
        'full_name': 'Jane Smith',
        'role': 'Engineer',
        'designation': 'Senior Tech',
        'station_id': 'MAITRI',
        'device_token': 'secret_setup_token',
      });

      final input = ProvisioningInput.fromQrPayload(rawPayload);

      expect(input.personnelId, 'personnel_123');
      expect(input.employeeCode, 'EMP99');
      expect(input.fullName, 'Jane Smith');
      expect(input.role, 'Engineer');
      expect(input.designation, 'Senior Tech');
      expect(input.stationId, 'MAITRI');
      expect(input.provisioningToken, 'secret_setup_token');
    });

    test('parses fallback field names correctly', () {
      final rawPayload = jsonEncode({
        'personnel_id': 'personnel_555',
        'employee_code': 'EMP02',
        'full_name': 'Bob Al',
        'role': 'Lead',
        'provisioning_token': 'fallback_token',
      });

      final input = ProvisioningInput.fromQrPayload(rawPayload);

      expect(input.personnelId, 'personnel_555');
      expect(input.employeeCode, 'EMP02');
      expect(input.fullName, 'Bob Al');
      expect(input.role, 'Lead');
      expect(input.designation, isNull);
      expect(input.stationId, 'MAITRI'); // defaults to MAITRI
      expect(input.provisioningToken, 'fallback_token');
    });
  });

  group('ProvisioningRepository lifecycle', () {
    test('isProvisioned returns false initially and true after provisioning', () async {
      expect(await repository.isProvisioned(), isFalse);

      final input = ProvisioningInput(
        personnelId: 'p_1',
        employeeCode: 'E1',
        fullName: 'Name',
        role: 'Role',
        stationId: 'MAITRI',
        provisioningToken: 'tok',
      );

      await repository.provision(input);

      expect(await repository.isProvisioned(), isTrue);
    });

    test('provision computes correct SHA-256 hash and updates database', () async {
      final token = 'secret_token_123';
      final expectedHash = sha256.convert(utf8.encode(token)).toString();

      final input = ProvisioningInput(
        personnelId: 'p_1',
        employeeCode: 'E1',
        fullName: 'John',
        role: 'Station Manager',
        designation: 'Lead Investigator',
        stationId: 'MAITRI',
        provisioningToken: token,
      );

      final result = await repository.provision(input);

      expect(result.id, 'p_1');
      expect(result.employeeCode, 'E1');
      expect(result.fullName, 'John');
      expect(result.role, 'Station Manager');
      expect(result.designation, 'Lead Investigator');
      expect(result.stationId, 'MAITRI');
      expect(result.authTokenHash, expectedHash);
      expect(result.deviceId, isNotEmpty);
      expect(result.deviceId.length, 36); // standard UUID format length
    });
  });
}
