import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:drift/drift.dart' hide Column;

import '../../../data/local/database.dart';
import '../../../data/repositories/sos_repository.dart';
import '../../../data/repositories/sync_repository.dart';
import '../../../services/sync_engine.dart';

class SosScreen extends StatefulWidget {
  const SosScreen({super.key, required this.database});

  final AppDatabase database;

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> with SingleTickerProviderStateMixin {
  late final SosRepository _repository;
  late final SyncEngine _syncEngine;

  String _selectedType = 'medical';
  String _selectedSeverity = 'critical';
  final _descriptionController = TextEditingController();

  late final AnimationController _animationController;
  bool _isHolding = false;
  String? _statusMessage;
  bool _isOnline = true;

  @override
  void initState() {
    super.initState();
    _repository = SosRepository(widget.database, SyncRepository(widget.database));
    _syncEngine = SyncEngine(widget.database);

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );

    _animationController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _triggerSos();
      }
    });

    _syncConnectivityStatus();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _syncConnectivityStatus() async {
    final latestLog = await (widget.database.select(widget.database.connectivityLog)
          ..orderBy([(t) => OrderingTerm.desc(t.checkedAt)])
          ..limit(1))
        .getSingleOrNull();
    if (mounted) {
      setState(() {
        _isOnline = latestLog?.isOnline ?? true;
      });
    }
  }

  Future<void> _toggleConnectivity() async {
    final newOnline = !_isOnline;
    await widget.database.into(widget.database.connectivityLog).insert(
          ConnectivityLogCompanion.insert(
            isOnline: newOnline,
            linkType: Value(newOnline ? 'wifi' : 'none'),
            checkedAt: Value(DateTime.now().toUtc().toIso8601String()),
          ),
        );
    await _syncConnectivityStatus();
  }

  Future<void> _triggerSos() async {
    setState(() {
      _isHolding = false;
      _statusMessage = 'Saving SOS Alert Locally...';
    });
    _animationController.reset();

    double? lat;
    double? lng;

    try {
      final hasPermission = await Geolocator.checkPermission();
      if (hasPermission == LocationPermission.whileInUse ||
          hasPermission == LocationPermission.always) {
        final position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 3),
          ),
        );
        lat = position.latitude;
        lng = position.longitude;
      }
    } catch (_) {
      // Ignore location fetch errors to prevent blocking SOS save
    }

    final type = _selectedType;
    final severity = _selectedSeverity;
    final desc = _descriptionController.text.trim();

    await _repository.createSosIncident(
      incidentType: type,
      severity: severity,
      description: desc.isEmpty ? null : desc,
      latitude: lat,
      longitude: lng,
    );

    if (mounted) {
      setState(() {
        _statusMessage = 'SOS Saved Offline! Broadcasting...';
      });
    }

    // Trigger immediate out-of-cycle sync
    await _syncEngine.triggerSync();

    if (mounted) {
      setState(() {
        _statusMessage = 'SOS Broadcast Sent / Retrying...';
      });
      Future.delayed(const Duration(seconds: 4), () {
        if (mounted) {
          setState(() {
            _statusMessage = null;
          });
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Emergency SOS'),
        actions: [
          Row(
            children: [
              Icon(
                _isOnline ? Icons.wifi : Icons.wifi_off,
                color: _isOnline ? Colors.green : Colors.grey,
              ),
              const SizedBox(width: 4),
              Text(
                _isOnline ? 'Online' : 'Offline',
                style: const TextStyle(fontSize: 12),
              ),
              IconButton(
                icon: const Icon(Icons.swap_horiz),
                tooltip: 'Mock Network Toggle',
                onPressed: _toggleConnectivity,
              ),
            ],
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          key: const Key('sos_form'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Pending status pill
              StreamBuilder<int>(
                stream: _repository.watchPendingCount(),
                builder: (context, snapshot) {
                  final pending = snapshot.data ?? 0;
                  if (pending == 0) return const SizedBox.shrink();
                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.amber.shade400),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.cloud_upload_outlined, color: Colors.orange),
                        const SizedBox(width: 8),
                        Text(
                          '$pending SOS Alert(s) pending station server sync',
                          style: TextStyle(color: Colors.amber.shade900, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  );
                },
              ),

              if (_statusMessage != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade900,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _statusMessage!,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),

              // Title
              const Text(
                'Incident Details',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),

              // Incident Type Selection Cards
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _IncidentTypeCard(
                    type: 'medical',
                    label: 'Medical',
                    icon: Icons.medical_services_outlined,
                    isSelected: _selectedType == 'medical',
                    onTap: () => setState(() => _selectedType = 'medical'),
                  ),
                  _IncidentTypeCard(
                    type: 'equipment',
                    label: 'Equipment',
                    icon: Icons.build_outlined,
                    isSelected: _selectedType == 'equipment',
                    onTap: () => setState(() => _selectedType = 'equipment'),
                  ),
                  _IncidentTypeCard(
                    type: 'environmental',
                    label: 'Weather',
                    icon: Icons.severe_cold_outlined,
                    isSelected: _selectedType == 'environmental',
                    onTap: () => setState(() => _selectedType = 'environmental'),
                  ),
                  _IncidentTypeCard(
                    type: 'other',
                    label: 'Other',
                    icon: Icons.more_horiz_outlined,
                    isSelected: _selectedType == 'other',
                    onTap: () => setState(() => _selectedType = 'other'),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Severity Selector
              const Text(
                'Severity Level',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'critical', label: Text('CRITICAL'), icon: Icon(Icons.gavel)),
                  ButtonSegment(value: 'high', label: Text('HIGH')),
                  ButtonSegment(value: 'medium', label: Text('MED')),
                  ButtonSegment(value: 'low', label: Text('LOW')),
                ],
                selected: {_selectedSeverity},
                onSelectionChanged: (set) {
                  setState(() {
                    _selectedSeverity = set.first;
                  });
                },
              ),
              const SizedBox(height: 20),

              // Description Text Box
              TextField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Emergency Details / Notes',
                  alignLabelWithHint: true,
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 32),

              // HOLD TO SOS Button Area
              Center(
                child: Column(
                  children: [
                    GestureDetector(
                      onTapDown: (_) {
                        setState(() => _isHolding = true);
                        _animationController.forward();
                      },
                      onTapUp: (_) {
                        setState(() => _isHolding = false);
                        _animationController.reverse();
                      },
                      onTapCancel: () {
                        setState(() => _isHolding = false);
                        _animationController.reverse();
                      },
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Ripple/pulsing back glow when holding
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            width: _isHolding ? 170 : 150,
                            height: _isHolding ? 170 : 150,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.red.withValues(alpha: _isHolding ? 0.3 : 0.1),
                            ),
                          ),
                          // Custom progress loader around the button
                          SizedBox(
                            width: 130,
                            height: 130,
                            child: AnimatedBuilder(
                              animation: _animationController,
                              builder: (context, child) {
                                return CircularProgressIndicator(
                                  value: _animationController.value,
                                  color: Colors.red.shade900,
                                  strokeWidth: 8,
                                );
                              },
                            ),
                          ),
                          // The main SOS Button
                          Container(
                            width: 110,
                            height: 110,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: RadialGradient(
                                colors: [Colors.red.shade600, Colors.red.shade900],
                              ),
                              boxShadow: const [
                                BoxShadow(
                                  color: Colors.black38,
                                  blurRadius: 10,
                                  offset: Offset(0, 5),
                                ),
                              ],
                            ),
                            child: const Center(
                              child: Text(
                                'SOS',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 32,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 2,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _isHolding ? 'HOLD BUTTON FOR 2 SECONDS...' : 'HOLD BUTTON TO ACTIVATE',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _isHolding ? Colors.red.shade800 : Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Recent emergency logs
              const Text(
                'Recent Alerts Logs',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),

              StreamBuilder<List<SosIncidentLocalRow>>(
                stream: _repository.watchRecent(),
                builder: (context, snapshot) {
                  final list = snapshot.data ?? [];
                  if (list.isEmpty) {
                    return const Card(
                      child: Padding(
                        padding: EdgeInsets.all(24.0),
                        child: Center(
                          child: Text(
                            'No emergency reports logged.',
                            style: TextStyle(color: Colors.grey),
                          ),
                        ),
                      ),
                    );
                  }

                  return Column(
                    children: list.map((item) {
                      IconData icon;
                      Color iconColor;
                      switch (item.incidentType) {
                        case 'medical':
                          icon = Icons.medical_services_outlined;
                          iconColor = Colors.red;
                          break;
                        case 'equipment':
                          icon = Icons.build_outlined;
                          iconColor = Colors.blue;
                          break;
                        case 'environmental':
                          icon = Icons.severe_cold_outlined;
                          iconColor = Colors.orange;
                          break;
                        default:
                          icon = Icons.more_horiz_outlined;
                          iconColor = Colors.grey;
                      }

                      final isCritical = item.severity == 'critical';

                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        shape: RoundedRectangleBorder(
                          side: BorderSide(
                            color: isCritical ? Colors.red.shade300 : Colors.transparent,
                            width: 1.5,
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: iconColor.withValues(alpha: 0.1),
                            child: Icon(icon, color: iconColor),
                          ),
                          title: Row(
                            children: [
                              Text(
                                item.incidentType.toUpperCase(),
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isCritical ? Colors.red.shade100 : Colors.grey.shade200,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  item.severity.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: isCritical ? Colors.red.shade900 : Colors.black87,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (item.description != null) ...[
                                const SizedBox(height: 4),
                                Text(item.description!),
                              ],
                              const SizedBox(height: 4),
                              Text(
                                'Reported At: ${item.reportedAt}',
                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                              ),
                              if (item.latitude != null && item.longitude != null)
                                Text(
                                  'GPS: ${item.latitude!.toStringAsFixed(4)}, ${item.longitude!.toStringAsFixed(4)}',
                                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                            ],
                          ),
                          trailing: Icon(
                            item.isSynced ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
                            color: item.isSynced ? Colors.green : Colors.amber,
                          ),
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IncidentTypeCard extends StatelessWidget {
  const _IncidentTypeCard({
    required this.type,
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  final String type;
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 76,
        height: 80,
        decoration: BoxDecoration(
          color: isSelected ? Colors.red.shade50 : theme.cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? Colors.red.shade600 : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isSelected ? Colors.red.shade800 : Colors.grey.shade700,
              size: 28,
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? Colors.red.shade900 : Colors.black87,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
