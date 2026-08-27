import 'package:flutter/material.dart';

import '../../../data/local/database.dart';
import '../../../data/repositories/resource_usage_repository.dart';
import '../../../data/repositories/sync_repository.dart';

class ResourceUsageScreen extends StatefulWidget {
  const ResourceUsageScreen({super.key, required this.database});

  final AppDatabase database;

  @override
  State<ResourceUsageScreen> createState() => _ResourceUsageScreenState();
}

class _ResourceUsageScreenState extends State<ResourceUsageScreen> {
  late final ResourceUsageRepository _repository;
  final _formKey = GlobalKey<FormState>();

  final _resourceNameController = TextEditingController();
  String _usageType = 'fuel';
  final _quantityController = TextEditingController();
  final _unitController = TextEditingController();
  final _notesController = TextEditingController();

  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _repository = ResourceUsageRepository(widget.database, SyncRepository(widget.database));
  }

  @override
  void dispose() {
    _resourceNameController.dispose();
    _quantityController.dispose();
    _unitController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _submitting = true);
    try {
      await _repository.createResourceUsage(
        resourceName: _resourceNameController.text.trim(),
        usageType: _usageType,
        quantity: double.tryParse(_quantityController.text.trim()) ?? 0.0,
        unit: _unitController.text.trim().isEmpty ? null : _unitController.text.trim(),
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );

      _resourceNameController.clear();
      _quantityController.clear();
      _unitController.clear();
      _notesController.clear();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Resource usage logged locally.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to save log: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'fuel':
        return Icons.local_gas_station;
      case 'power':
        return Icons.bolt;
      case 'equipment':
        return Icons.construction;
      default:
        return Icons.help_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Resource Usage'),
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
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left side / Top side: Logging Form
          Expanded(
            flex: 5,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Card(
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Log resource consumption',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _resourceNameController,
                          decoration: const InputDecoration(
                            labelText: 'Resource name *',
                            hintText: 'e.g. Diesel Generator A, Snowmobile B',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                        ),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          initialValue: _usageType,
                          decoration: const InputDecoration(
                            labelText: 'Usage type *',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'fuel', child: Text('Fuel')),
                            DropdownMenuItem(value: 'power', child: Text('Power')),
                            DropdownMenuItem(value: 'equipment', child: Text('Equipment')),
                          ],
                          onChanged: (v) {
                            if (v != null) {
                              setState(() => _usageType = v);
                            }
                          },
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: TextFormField(
                                controller: _quantityController,
                                decoration: const InputDecoration(
                                  labelText: 'Quantity *',
                                  border: OutlineInputBorder(),
                                ),
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                validator: (v) {
                                  if (v == null || v.trim().isEmpty) return 'Required';
                                  if (double.tryParse(v.trim()) == null) return 'Must be a number';
                                  return null;
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                controller: _unitController,
                                decoration: const InputDecoration(
                                  labelText: 'Unit',
                                  hintText: 'e.g. L, kWh, hrs',
                                  border: OutlineInputBorder(),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _notesController,
                          decoration: const InputDecoration(
                            labelText: 'Notes',
                            hintText: 'Add extra details...',
                            border: OutlineInputBorder(),
                          ),
                          maxLines: 2,
                        ),
                        const SizedBox(height: 20),
                        FilledButton.icon(
                          onPressed: _submitting ? null : _submit,
                          icon: _submitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Icon(Icons.save_outlined),
                          label: const Text('Log resource usage'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Right side: Recent logs
          Expanded(
            flex: 6,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(0, 16, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                    child: Text(
                      'Recent logs',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  Expanded(
                    child: StreamBuilder<List<ResourceUsageLocalRow>>(
                      stream: _repository.watchRecent(),
                      builder: (context, snapshot) {
                        final items = snapshot.data ?? const [];
                        if (items.isEmpty) {
                          return const Center(
                            child: Text('No resources logged yet.'),
                          );
                        }
                        return ListView.builder(
                          itemCount: items.length,
                          itemBuilder: (context, index) {
                            final item = items[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: CircleAvatar(
                                  child: Icon(_getTypeIcon(item.usageType)),
                                ),
                                title: Text(item.resourceName),
                                subtitle: Text(
                                  '${_formatQuantity(item.quantity)}${item.unit != null ? ' ${item.unit}' : ''}'
                                  '${item.notes != null ? '  ·  ${item.notes}' : ''}',
                                ),
                                trailing: Icon(
                                  item.isSynced ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
                                  color: Theme.of(context).hintColor,
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatQuantity(double q) => q == q.roundToDouble() ? q.toStringAsFixed(0) : q.toString();
}
