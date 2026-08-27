// Append-only "event" tables: field_updates, location_tracks,
// resource_usage_logs, sos_incidents, inventory_transactions.
//
// These are never conflict-resolved. The client-generated UUID `id` is
// what makes retries idempotent — a re-sent row from a flaky satellite
// link is just INSERT ... ON CONFLICT (id) DO NOTHING.
//
// `columns` is a WHITELIST of payload keys that are allowed to be
// written to the table. This is a security boundary as much as a
// convenience: column names are baked into the SQL text (they can't be
// parameterized), so they must never be derived from untrusted payload
// keys directly. Only literal names from this list are ever used.
//
// `server_received_at` is always stamped by the central server itself
// (never trusted from the incoming payload) so audit/latency numbers
// reflect *our* clock, not the station's.

const EVENT_TABLES = {
  field_updates: {
    columns: [
      'personnel_id',
      'station_id',
      'update_type',
      'content',
      'attachments',
      'occurred_at',
      'origin_device_id',
    ],
    jsonColumns: ['attachments'],
  },

  location_tracks: {
    columns: [
      'personnel_id',
      'station_id',
      'points',
      'point_count',
      'track_started_at',
      'track_ended_at',
      'origin_device_id',
    ],
    jsonColumns: ['points'],
  },

  resource_usage_logs: {
    columns: [
      'resource_id',
      'station_id',
      'recorded_by',
      'usage_type',
      'quantity',
      'unit',
      'notes',
      'occurred_at',
      'origin_device_id',
    ],
  },

  sos_incidents: {
    columns: [
      'personnel_id',
      'station_id',
      'incident_type',
      'description',
      'severity',
      'latitude',
      'longitude',
      'status',
      'reported_at',
      'acknowledged_at',
      'resolved_at',
      'origin_device_id',
    ],
  },

  inventory_transactions: {
    columns: [
      'station_id',
      'inventory_id',
      'change_qty',
      'txn_type',
      'reference_table',
      'reference_id',
      'performed_by',
      'occurred_at',
      'origin_device_id',
    ],
  },
};

module.exports = { EVENT_TABLES };
