import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../local/database.dart';

/// Data collected during setup, either scanned from a station-issued QR
/// code or entered by hand. `provisioningToken` is the one-time credential
/// the station server hands out at setup; it is never stored in the clear
/// — only its hash lives on the device (see [SelfProfileRow.authTokenHash]).
class ProvisioningInput {
  ProvisioningInput({
    required this.personnelId,
    required this.employeeCode,
    required this.fullName,
    required this.role,
    this.designation,
    required this.stationId,
    required this.provisioningToken,
  });

  final String personnelId;
  final String employeeCode;
  final String fullName;
  final String role;
  final String? designation;
  final String stationId;
  final String provisioningToken;

  /// Parses the JSON payload a station-issued QR code is expected to
  /// contain. Kept permissive on field names so teammate B's exact QR
  /// format can be wired in later without touching the rest of this flow.
  factory ProvisioningInput.fromQrPayload(String raw) {
    final Map<String, dynamic> json = jsonDecode(raw) as Map<String, dynamic>;
    return ProvisioningInput(
      personnelId: json['id'] as String? ?? json['personnel_id'] as String,
      employeeCode: json['employee_code'] as String,
      fullName: json['full_name'] as String,
      role: json['role'] as String,
      designation: json['designation'] as String?,
      stationId: json['station_id'] as String? ?? 'MAITRI',
      provisioningToken:
          json['device_token'] as String? ?? json['provisioning_token'] as String,
    );
  }
}

/// Runs the device through setup exactly once: this is the *only* place
/// `self_profile` gets written. After this succeeds, every future app
/// launch reads that single row to authenticate — there is no
/// "log in every session" flow, and nothing here requires connectivity
/// beyond whatever the caller used to obtain the [ProvisioningInput]
/// (e.g. a QR scan or a value manually copied from the station office).
class ProvisioningRepository {
  ProvisioningRepository(this._db);

  final AppDatabase _db;
  static const _uuid = Uuid();

  Future<bool> isProvisioned() async {
    return (await _db.getSelfProfile()) != null;
  }

  /// Generates this device's UUID, hashes the provisioning token, and
  /// commits the single `self_profile` row. Idempotent: calling this again
  /// on an already-provisioned device overwrites the row (used by a
  /// future "re-provision this device" recovery flow, not by normal boot).
  Future<SelfProfileRow> provision(ProvisioningInput input) async {
    final deviceId = _uuid.v4();
    final tokenHash = sha256.convert(utf8.encode(input.provisioningToken)).toString();

    final row = SelfProfileCompanion.insert(
      id: input.personnelId,
      employeeCode: input.employeeCode,
      fullName: input.fullName,
      role: input.role,
      designation: Value(input.designation),
      stationId: input.stationId,
      authTokenHash: Value(tokenHash),
      deviceId: deviceId,
    );

    await _db.into(_db.selfProfile).insertOnConflictUpdate(row);
    return (await _db.getSelfProfile())!;
  }
}
