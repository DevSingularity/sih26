import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../data/local/database.dart';
import '../../../data/repositories/field_updates_repository.dart';
import '../../../data/repositories/sync_repository.dart';

/// Section 3 "Field Updates": form for daily activity / site conditions /
/// notes, with an optional photo attachment. Every save writes straight
/// to `field_updates_local` + `outbox_queue` (via [FieldUpdatesRepository])
/// and is complete the moment it's committed — nothing here waits on, or
/// can be blocked by, a network call. The upload of any attached photo
/// bytes happens later, opportunistically, during an outbox flush.
class FieldUpdatesScreen extends StatefulWidget {
  const FieldUpdatesScreen({super.key, required this.database});

  final AppDatabase database;

  @override
  State<FieldUpdatesScreen> createState() => _FieldUpdatesScreenState();
}

class _FieldUpdatesScreenState extends State<FieldUpdatesScreen> {
  late final FieldUpdatesRepository _repository;

  final _formKey = GlobalKey<FormState>();
  final _contentController = TextEditingController();
  String _updateType = 'daily_activity';
  final List<String> _attachmentPaths = [];
  bool _saving = false;

  static const _updateTypeLabels = {
    'daily_activity': 'Daily activity',
    'site_condition': 'Site condition',
    'note': 'Note',
  };

  @override
  void initState() {
    super.initState();
    _repository = FieldUpdatesRepository(
      widget.database,
      SyncRepository(widget.database),
    );
  }

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    // image_picker's camera source has no network dependency — it reads
    // straight from the device camera/gallery, so this is safe fully
    // offline. Worth confirming against the installed image_picker: ^1.1.2
    // API docs if this call ever throws a MissingPluginException, since
    // plugin surface can shift between majors.
    final picker = ImagePicker();
    final XFile? file = await picker.pickImage(source: ImageSource.camera);
    if (file == null) return;
    setState(() => _attachmentPaths.add(file.path));
  }

  void _removeAttachment(String path) {
    setState(() => _attachmentPaths.remove(path));
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    try {
      await _repository.createFieldUpdate(
        updateType: _updateType,
        content: _contentController.text.trim(),
        attachmentPaths: List.of(_attachmentPaths),
      );

      if (!mounted) return;
      _contentController.clear();
      setState(() {
        _attachmentPaths.clear();
        _updateType = 'daily_activity';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Saved locally. Will sync when connected.')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Field Updates'),
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
      body: Column(
        children: [
          Expanded(flex: 0, child: _buildForm(context)),
          const Divider(height: 1),
          Expanded(child: _buildHistory()),
        ],
      ),
    );
  }

  Widget _buildForm(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('New update', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _updateType,
              decoration: const InputDecoration(labelText: 'Type', border: OutlineInputBorder()),
              items: _updateTypeLabels.entries
                  .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                  .toList(),
              onChanged: (value) {
                if (value != null) setState(() => _updateType = value);
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _contentController,
              minLines: 3,
              maxLines: 6,
              decoration: const InputDecoration(
                labelText: 'Content',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'Content is required' : null,
            ),
            const SizedBox(height: 12),
            if (_attachmentPaths.isNotEmpty)
              SizedBox(
                height: 84,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _attachmentPaths.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final path = _attachmentPaths[index];
                    return Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.file(
                            File(path),
                            width: 84,
                            height: 84,
                            fit: BoxFit.cover,
                          ),
                        ),
                        Positioned(
                          right: 0,
                          top: 0,
                          child: GestureDetector(
                            onTap: () => _removeAttachment(path),
                            child: const CircleAvatar(
                              radius: 10,
                              backgroundColor: Colors.black54,
                              child: Icon(Icons.close, size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            const SizedBox(height: 8),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: _saving ? null : _pickPhoto,
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('Attach photo'),
                ),
                const Spacer(),
                FilledButton.icon(
                  onPressed: _saving ? null : _save,
                  icon: _saving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.save_outlined),
                  label: const Text('Save'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistory() {
    return StreamBuilder<List<FieldUpdateLocalRow>>(
      stream: _repository.watchRecent(),
      builder: (context, snapshot) {
        final rows = snapshot.data ?? const [];
        if (snapshot.connectionState == ConnectionState.waiting && rows.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }
        if (rows.isEmpty) {
          return const Center(child: Text('No field updates yet.'));
        }
        return ListView.separated(
          itemCount: rows.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final row = rows[index];
            final attachments = row.attachmentPaths == null
                ? const <String>[]
                : (jsonDecode(row.attachmentPaths!) as List).cast<String>();
            return ListTile(
              leading: Icon(
                row.isSynced ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
              ),
              title: Text(_updateTypeLabels[row.updateType] ?? row.updateType),
              subtitle: Text(row.content, maxLines: 2, overflow: TextOverflow.ellipsis),
              trailing: attachments.isEmpty
                  ? null
                  : Icon(Icons.attach_file, size: 18, color: Theme.of(context).hintColor),
            );
          },
        );
      },
    );
  }
}
