import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../data/local/database.dart';
import '../../../data/repositories/provisioning_repository.dart';
import '../../../services/sync_engine.dart';
import '../../home/screens/home_screen.dart';

/// One-time setup screen. Provisions this device — either by scanning a
/// station-issued QR code or by entering the same details by hand — then
/// writes `self_profile` and hands off to the app shell. Never shown again
/// on this device once provisioning succeeds: see main.dart, which routes
/// straight past this screen on every later launch.
class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    required this.database,
    required this.syncEngine,
  });

  final AppDatabase database;
  final SyncEngine syncEngine;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  late final ProvisioningRepository _repo = ProvisioningRepository(widget.database);
  final _formKey = GlobalKey<FormState>();

  final _personnelId = TextEditingController();
  final _employeeCode = TextEditingController();
  final _fullName = TextEditingController();
  final _role = TextEditingController();
  final _designation = TextEditingController();
  final _stationId = TextEditingController(text: 'MAITRI');
  final _provisioningToken = TextEditingController();

  bool _scanning = false;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _personnelId.dispose();
    _employeeCode.dispose();
    _fullName.dispose();
    _role.dispose();
    _designation.dispose();
    _stationId.dispose();
    _provisioningToken.dispose();
    super.dispose();
  }

  Future<void> _finishProvisioning(ProvisioningInput input) async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await _repo.provision(input);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => HomeScreen(
            database: widget.database,
            syncEngine: widget.syncEngine,
          ),
        ),
      );
    } catch (e) {
      setState(() => _error = 'Could not save device setup: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _onQrDetect(BarcodeCapture capture) {
    if (_submitting) return;
    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw == null) return;
    setState(() => _scanning = false);
    try {
      _finishProvisioning(ProvisioningInput.fromQrPayload(raw));
    } catch (e) {
      setState(() => _error = 'Unrecognized QR code from the station: $e');
    }
  }

  void _onManualSubmit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    _finishProvisioning(ProvisioningInput(
      personnelId: _personnelId.text.trim(),
      employeeCode: _employeeCode.text.trim(),
      fullName: _fullName.text.trim(),
      role: _role.text.trim(),
      designation: _designation.text.trim().isEmpty ? null : _designation.text.trim(),
      stationId: _stationId.text.trim(),
      provisioningToken: _provisioningToken.text.trim(),
    ));
  }

  @override
  Widget build(BuildContext context) {
    if (_scanning) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Scan station QR code'),
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => setState(() => _scanning = false),
          ),
        ),
        body: MobileScanner(onDetect: _onQrDetect),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Set up this device')),
      body: AbsorbPointer(
        absorbing: _submitting,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'This device belongs to one person for one expedition. '
                  'Set it up once — you will not be asked to log in again, '
                  'even offline.',
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () => setState(() => _scanning = true),
                  icon: const Icon(Icons.qr_code_scanner),
                  label: const Text('Scan station QR code'),
                ),
                const SizedBox(height: 24),
                const Text('— or enter details manually —',
                    textAlign: TextAlign.center),
                const SizedBox(height: 16),
                _field(_personnelId, 'Personnel ID (from central server)'),
                _field(_employeeCode, 'Employee code'),
                _field(_fullName, 'Full name'),
                _field(_role, 'Role'),
                _field(_designation, 'Designation (optional)', required: false),
                _field(_stationId, 'Station ID'),
                _field(_provisioningToken, 'Provisioning token', obscure: true),
                const SizedBox(height: 16),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ),
                FilledButton(
                  onPressed: _submitting ? null : _onManualSubmit,
                  child: _submitting
                      ? const SizedBox(
                          height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Finish setup'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String label,
      {bool required = true, bool obscure = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: c,
        obscureText: obscure,
        decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
        validator: required
            ? (v) => (v == null || v.trim().isEmpty) ? 'Required' : null
            : null,
      ),
    );
  }
}

extension _FirstOrNull<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
