import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../data/local/database.dart';
import '../../../data/repositories/cargo_repository.dart';
import '../../../data/repositories/sync_repository.dart';

/// Section 3 "Cargo Handling": scan (barcode/QR via camera) -> upload
/// photo -> verify -> confirm, a 4-stage flow matching
/// `cargo_items_local.status`. Every stage transition writes straight to
/// SQLite + the outbox via [CargoRepository] and is complete the moment
/// it's committed — nothing here ever waits on a network call. A
/// partially-completed item (e.g. scanned but not yet uploaded) stays
/// visible under "In progress" and can be resumed after the app is
/// killed and reopened, since it's driven entirely off what's in
/// `cargo_items_local`, not in-memory state.
class CargoHandlingScreen extends StatefulWidget {
  const CargoHandlingScreen({super.key, required this.database});

  final AppDatabase database;

  @override
  State<CargoHandlingScreen> createState() => _CargoHandlingScreenState();
}

class _CargoHandlingScreenState extends State<CargoHandlingScreen> {
  late final CargoRepository _repository;

  @override
  void initState() {
    super.initState();
    _repository = CargoRepository(widget.database, SyncRepository(widget.database));
  }

  Future<void> _addManually() async {
    final details = await showDialog<_NewCargoItemDetails>(
      context: context,
      builder: (_) => const _NewCargoItemDialog(initialBarcode: ''),
    );
    if (details == null) return;

    await _repository.scanItem(
      itemName: details.itemName,
      barcode: details.barcode,
      shipmentId: details.shipmentId,
      category: details.category,
      quantity: details.quantity,
      unit: details.unit,
      weightKg: details.weightKg,
    );

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Item added manually. Saved locally.')),
    );
  }

  Future<void> _scanNewItem() async {
    final barcode = await Navigator.of(context).push<String?>(
      MaterialPageRoute(builder: (_) => const _BarcodeScanScreen()),
    );
    // A null return means the crew member backed out of the scanner
    // without a read — nothing to do. An empty string means "skip,
    // enter details manually" (no barcode on this item), which the
    // details form below still handles fine.
    if (barcode == null) return;
    if (!mounted) return;

    final details = await showDialog<_NewCargoItemDetails>(
      context: context,
      builder: (_) => _NewCargoItemDialog(initialBarcode: barcode),
    );
    if (details == null) return;

    await _repository.scanItem(
      itemName: details.itemName,
      barcode: details.barcode,
      shipmentId: details.shipmentId,
      category: details.category,
      quantity: details.quantity,
      unit: details.unit,
      weightKg: details.weightKg,
    );

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Item scanned. Saved locally.')),
    );
  }

  Future<void> _advanceUpload(CargoItemLocalRow item) async {
    final picker = ImagePicker();
    // Camera-only source, same as Field Updates — reads straight from
    // the device camera, no network dependency, so this is safe fully
    // offline.
    final XFile? file = await picker.pickImage(source: ImageSource.camera);
    if (file == null) return;

    await _repository.markUploaded(id: item.id, photoPath: file.path);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Photo attached for ${item.itemName}.')),
    );
  }

  Future<void> _advanceVerify(CargoItemLocalRow item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Verify item'),
        content: Text(
          'Confirm the physical item matches the record:\n\n'
          '${item.itemName}'
          '${item.quantity > 0 ? '  ·  ${_formatQuantity(item.quantity)}${item.unit != null ? ' ${item.unit}' : ''}' : ''}'
          '${item.barcode != null ? '\nBarcode: ${item.barcode}' : ''}',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Matches — verify')),
        ],
      ),
    );
    if (confirmed != true) return;

    await _repository.verifyItem(id: item.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${item.itemName} verified.')),
    );
  }

  Future<void> _advanceConfirm(CargoItemLocalRow item) async {
    await _repository.confirmItem(id: item.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${item.itemName} confirmed. Will sync when connected.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cargo Handling'),
        actions: [
          StreamBuilder<int>(
            stream: _repository.watchPendingCount(),
            builder: (context, snapshot) {
              final pending = snapshot.data ?? 0;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Center(
                  child: Chip(
                    label: Text(pending == 0 ? 'Synced' : '$pending pending'),
                    avatar: Icon(
                      pending == 0 ? Icons.cloud_done : Icons.cloud_upload_outlined,
                      size: 18,
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          FloatingActionButton.extended(
            heroTag: 'add_manual',
            onPressed: _addManually,
            icon: const Icon(Icons.edit_note_outlined),
            label: const Text('Add manually'),
          ),
          const SizedBox(height: 12),
          FloatingActionButton.extended(
            heroTag: 'scan_item',
            onPressed: _scanNewItem,
            icon: const Icon(Icons.qr_code_scanner),
            label: const Text('Scan item'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        children: [
          Text('In progress', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          StreamBuilder<List<CargoItemLocalRow>>(
            stream: _repository.watchActive(),
            builder: (context, snapshot) {
              final items = snapshot.data ?? const [];
              if (items.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Text('No items in progress. Tap "Scan item" to start one.'),
                );
              }
              return Column(
                children: items
                    .map((item) => _CargoItemCard(
                          item: item,
                          onUpload: () => _advanceUpload(item),
                          onVerify: () => _advanceVerify(item),
                          onConfirm: () => _advanceConfirm(item),
                        ))
                    .toList(),
              );
            },
          ),
          const SizedBox(height: 24),
          Text('Confirmed', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          StreamBuilder<List<CargoItemLocalRow>>(
            stream: _repository.watchConfirmed(),
            builder: (context, snapshot) {
              final items = snapshot.data ?? const [];
              if (items.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Text('No confirmed items yet.'),
                );
              }
              return Column(
                children: items.map((item) {
                  return Card(
                    child: ListTile(
                      leading: Icon(
                        item.isSynced ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
                      ),
                      title: Text(item.itemName),
                      subtitle: Text(
                        '${_formatQuantity(item.quantity)}${item.unit != null ? ' ${item.unit}' : ''}'
                        '${item.barcode != null ? '  ·  ${item.barcode}' : ''}',
                      ),
                      trailing: const Icon(Icons.check_circle, color: Colors.green),
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}

String _formatQuantity(double q) => q == q.roundToDouble() ? q.toStringAsFixed(0) : q.toString();

/// One in-progress cargo item, with the button for whichever stage comes
/// next. The stage ladder — scanned -> uploaded -> verified -> confirmed —
/// is read straight off `item.status`, so this card never has its own
/// idea of "what stage is this item on" that could drift from the DB.
class _CargoItemCard extends StatelessWidget {
  const _CargoItemCard({
    required this.item,
    required this.onUpload,
    required this.onVerify,
    required this.onConfirm,
  });

  final CargoItemLocalRow item;
  final VoidCallback onUpload;
  final VoidCallback onVerify;
  final VoidCallback onConfirm;

  static const _statusLabels = {
    'scanned': 'Scanned',
    'uploaded': 'Photo uploaded',
    'verified': 'Verified',
    'confirmed': 'Confirmed',
  };

  @override
  Widget build(BuildContext context) {
    Widget actionButton;
    switch (item.status) {
      case 'scanned':
        actionButton = OutlinedButton.icon(
          onPressed: onUpload,
          icon: const Icon(Icons.camera_alt_outlined),
          label: const Text('Attach photo'),
        );
        break;
      case 'uploaded':
        actionButton = OutlinedButton.icon(
          onPressed: onVerify,
          icon: const Icon(Icons.fact_check_outlined),
          label: const Text('Verify'),
        );
        break;
      case 'verified':
        actionButton = FilledButton.icon(
          onPressed: onConfirm,
          icon: const Icon(Icons.check_circle_outline),
          label: const Text('Confirm'),
        );
        break;
      default:
        actionButton = const SizedBox.shrink();
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(item.itemName, style: Theme.of(context).textTheme.titleSmall),
                ),
                Chip(
                  label: Text(_statusLabels[item.status] ?? item.status),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${_formatQuantity(item.quantity)}${item.unit != null ? ' ${item.unit}' : ''}'
              '${item.weightKg != null ? '  ·  ${item.weightKg} kg' : ''}'
              '${item.barcode != null ? '\nBarcode: ${item.barcode}' : ''}'
              '${item.shipmentId != null ? '\nShipment: ${item.shipmentId}' : ''}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  item.isSynced ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
                  size: 16,
                  color: Theme.of(context).hintColor,
                ),
                const Spacer(),
                actionButton,
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Full-screen barcode/QR scanner. Pops with the scanned value, or with
/// an empty string if the crew member chooses to skip (no barcode on
/// this item), or with null if they back out entirely.
class _BarcodeScanScreen extends StatefulWidget {
  const _BarcodeScanScreen();

  @override
  State<_BarcodeScanScreen> createState() => _BarcodeScanScreenState();
}

class _BarcodeScanScreenState extends State<_BarcodeScanScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _handled = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    final value = capture.barcodes.isNotEmpty ? capture.barcodes.first.rawValue : null;
    if (value == null || value.isEmpty) return;
    _handled = true;
    Navigator.of(context).pop(value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan cargo item'),
        actions: [
          IconButton(
            tooltip: 'No barcode — enter manually',
            icon: const Icon(Icons.keyboard_outlined),
            onPressed: () => Navigator.of(context).pop(''),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(controller: _controller, onDetect: _onDetect),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              width: double.infinity,
              color: Colors.black54,
              padding: const EdgeInsets.all(16),
              child: const Text(
                'Point the camera at the item\'s barcode or QR code.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NewCargoItemDetails {
  _NewCargoItemDetails({
    required this.itemName,
    this.barcode,
    this.shipmentId,
    this.category,
    required this.quantity,
    this.unit,
    this.weightKg,
  });

  final String itemName;
  final String? barcode;
  final String? shipmentId;
  final String? category;
  final double quantity;
  final String? unit;
  final double? weightKg;
}

/// Form shown right after a scan (or a manual-entry skip) to capture the
/// rest of the item's details before it's written as the `scanned`-stage
/// row. [initialBarcode] is pre-filled but editable — an empty string
/// (from the scanner's "enter manually" action) just starts the field
/// blank.
class _NewCargoItemDialog extends StatefulWidget {
  const _NewCargoItemDialog({required this.initialBarcode});

  final String initialBarcode;

  @override
  State<_NewCargoItemDialog> createState() => _NewCargoItemDialogState();
}

class _NewCargoItemDialogState extends State<_NewCargoItemDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _barcodeController;
  final _nameController = TextEditingController();
  final _shipmentController = TextEditingController();
  final _categoryController = TextEditingController();
  final _quantityController = TextEditingController(text: '1');
  final _unitController = TextEditingController();
  final _weightController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _barcodeController = TextEditingController(text: widget.initialBarcode);
  }

  @override
  void dispose() {
    _barcodeController.dispose();
    _nameController.dispose();
    _shipmentController.dispose();
    _categoryController.dispose();
    _quantityController.dispose();
    _unitController.dispose();
    _weightController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    Navigator.of(context).pop(_NewCargoItemDetails(
      itemName: _nameController.text.trim(),
      barcode: _barcodeController.text.trim().isEmpty ? null : _barcodeController.text.trim(),
      shipmentId: _shipmentController.text.trim().isEmpty ? null : _shipmentController.text.trim(),
      category: _categoryController.text.trim().isEmpty ? null : _categoryController.text.trim(),
      quantity: double.tryParse(_quantityController.text.trim()) ?? 0,
      unit: _unitController.text.trim().isEmpty ? null : _unitController.text.trim(),
      weightKg: _weightController.text.trim().isEmpty ? null : double.tryParse(_weightController.text.trim()),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Item details'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Item name *'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              TextFormField(
                controller: _barcodeController,
                decoration: const InputDecoration(labelText: 'Barcode'),
              ),
              TextFormField(
                controller: _shipmentController,
                decoration: const InputDecoration(labelText: 'Shipment ID'),
              ),
              TextFormField(
                controller: _categoryController,
                decoration: const InputDecoration(labelText: 'Category'),
              ),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _quantityController,
                      decoration: const InputDecoration(labelText: 'Quantity'),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: _unitController,
                      decoration: const InputDecoration(labelText: 'Unit'),
                    ),
                  ),
                ],
              ),
              TextFormField(
                controller: _weightController,
                decoration: const InputDecoration(labelText: 'Weight (kg)'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(onPressed: _submit, child: const Text('Save')),
      ],
    );
  }
}
