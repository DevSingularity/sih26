const pool = require('../../../shared/config/db');
const writeWithOutbox = require('../outbox/writeWithOutbox');
const { z } = require('zod');

/**
 * Per-table zod schemas for required NOT NULL columns.
 * Only validates fields that the schema marks as NOT NULL without a DEFAULT.
 * The phone's outbox must include these; missing fields are rejected with
 * a specific reason so the phone knows what to fix.
 */
const REQUIRED_FIELDS = {
  cargo_shipments: z.object({
    id: z.string().uuid(),
    shipment_code: z.string().min(1),
    client_updated_at: z.string().min(1),
  }),
  cargo_items: z.object({
    id: z.string().uuid(),
    item_name: z.string().min(1),
    client_updated_at: z.string().min(1),
  }),
  inventory_stock: z.object({
    id: z.string().uuid(),
    item_category: z.string().min(1),
    item_name: z.string().min(1),
    client_updated_at: z.string().min(1),
  }),
  inventory_transactions: z.object({
    id: z.string().uuid(),
    change_qty: z.number(),
    txn_type: z.enum(['receive', 'consume', 'adjust', 'transfer']),
    occurred_at: z.string().min(1),
  }),
  resource_usage_logs: z.object({
    id: z.string().uuid(),
    usage_type: z.enum(['fuel', 'power', 'equipment']),
    quantity: z.number(),
    occurred_at: z.string().min(1),
  }),
  field_updates: z.object({
    id: z.string().uuid(),
    personnel_id: z.string().uuid(),
    update_type: z.enum(['daily_activity', 'site_condition', 'note']),
    content: z.string().min(1),
    occurred_at: z.string().min(1),
  }),
  location_tracks: z.object({
    id: z.string().uuid(),
    personnel_id: z.string().uuid(),
    points: z.array(z.object({
      lat: z.number(),
      lng: z.number(),
      accuracy_m: z.number().optional(),
      recorded_at: z.string(),
    })).min(1),
    point_count: z.number().int().positive(),
    track_started_at: z.string().min(1),
    track_ended_at: z.string().min(1),
  }),
  sos_incidents: z.object({
    id: z.string().uuid(),
    personnel_id: z.string().uuid(),
    incident_type: z.enum(['medical', 'equipment', 'environmental', 'other']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    reported_at: z.string().min(1),
  }),
  local_threshold_alerts: z.object({
    id: z.string().uuid(),
    metric: z.string().min(1),
    current_value: z.number(),
    threshold_value: z.number(),
    severity: z.enum(['warning', 'critical']),
  }),
};

const SYNCABLE_TABLES = new Set([
  'cargo_shipments', 'cargo_items', 'inventory_stock', 'inventory_transactions',
  'resource_usage_logs', 'field_updates', 'location_tracks', 'sos_incidents',
  'local_threshold_alerts',
]);

const VALID_OPERATIONS = new Set(['insert', 'update']);

/**
 * Apply a batch of records from a phone sync push.
 * - Idempotent per (device_id, batch_id): retries return cached response.
 * - Per-record savepoints: one bad record can't poison the whole batch.
 * - Each successful write goes through writeWithOutbox (transactional outbox).
 *
 * @param {{ device_id: string, batch_id: string, records: Array }} batch
 * @returns {{ batch_id, status, accepted, rejected }}
 */
async function applySyncBatch({ device_id, batch_id, records }) {
  // 1. Validate device exists
  const deviceCheck = await pool.query('SELECT id FROM devices WHERE id = $1', [device_id]);
  if (deviceCheck.rows.length === 0) {
    return {
      batch_id,
      status: 'failed',
      accepted: [],
      rejected: records.map(r => ({ entity_id: r.entity_id, reason: 'Unknown device_id' })),
    };
  }

  // 2. Idempotency check: has this (device_id, batch_id) been processed before?
  const cachedCheck = await pool.query(
    'SELECT response_json FROM sync_push_response_cache WHERE device_id = $1 AND batch_id = $2',
    [device_id, batch_id]
  );
  if (cachedCheck.rows.length > 0) {
    return cachedCheck.rows[0].response_json;
  }

  // 3. Process the batch inside a single transaction with per-record savepoints
  const client = await pool.connect();
  const accepted = [];
  const rejected = [];

  try {
    await client.query('BEGIN');

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];

      // Create a savepoint for this record so one failure doesn't poison the batch
      await client.query(`SAVEPOINT rec_${i}`);

      try {
        // Validate entity_table
        if (!SYNCABLE_TABLES.has(rec.entity_table)) {
          rejected.push({ entity_id: rec.entity_id, reason: `Unknown entity_table: ${rec.entity_table}` });
          await client.query(`ROLLBACK TO SAVEPOINT rec_${i}`);
          continue;
        }

        // Validate operation
        if (!VALID_OPERATIONS.has(rec.operation)) {
          rejected.push({ entity_id: rec.entity_id, reason: `Invalid operation: ${rec.operation}` });
          await client.query(`ROLLBACK TO SAVEPOINT rec_${i}`);
          continue;
        }

        // Validate payload has required fields
        const schema = REQUIRED_FIELDS[rec.entity_table];
        if (schema) {
          const parsed = schema.safeParse(rec.payload);
          if (!parsed.success) {
            const missingField = parsed.error.issues[0]?.path?.join('.') || parsed.error.issues[0]?.message;
            rejected.push({ entity_id: rec.entity_id, reason: `Validation failed: ${missingField}` });
            await client.query(`ROLLBACK TO SAVEPOINT rec_${i}`);
            continue;
          }
        }

        // Tables that have sync_version column (per 02_maitri_station_schema.sql)
        const TABLES_WITH_SYNC_VERSION = new Set([
          'cargo_shipments', 'cargo_items', 'inventory_stock',
        ]);

        // Stamp sync/audit columns onto the payload
        const stampedPayload = {
          ...rec.payload,
          id: rec.entity_id, // Ensure id matches
          origin_device_id: device_id,
          server_received_at: new Date().toISOString(),
        };

        // Only stamp sync_version for tables that have the column
        if (TABLES_WITH_SYNC_VERSION.has(rec.entity_table)) {
          if (rec.operation === 'update') {
            const versionCheck = await client.query(
              `SELECT sync_version FROM ${rec.entity_table} WHERE id = $1`,
              [rec.entity_id]
            );
            if (versionCheck.rows.length > 0) {
              stampedPayload.sync_version = (versionCheck.rows[0].sync_version || 0) + 1;
            } else {
              stampedPayload.sync_version = 1;
            }
          } else {
            stampedPayload.sync_version = 1;
          }
        }

        // Write via the outbox helper
        await writeWithOutbox(client, {
          table: rec.entity_table,
          id: rec.entity_id,
          operation: rec.operation,
          row: stampedPayload,
          priority: rec.entity_table === 'sos_incidents' ? 'immediate' : 'normal',
        });

        accepted.push(rec.entity_id);
      } catch (err) {
        // Per-record DB error (FK violation, CHECK constraint, etc.)
        await client.query(`ROLLBACK TO SAVEPOINT rec_${i}`);
        rejected.push({ entity_id: rec.entity_id, reason: err.message });
      }
    }

    // 4. Determine batch status
    let status;
    if (rejected.length === 0) {
      status = 'applied';
    } else if (accepted.length === 0) {
      status = 'failed';
    } else {
      status = 'partial';
    }

    // 5. Record the batch in inbound_phone_batches
    await client.query(
      `INSERT INTO inbound_phone_batches (device_id, batch_id, record_count, status)
       VALUES ($1, $2, $3, $4)`,
      [device_id, batch_id, records.length, status]
    );

    // 6. Cache the response for idempotent retries
    const response = { batch_id, status, accepted, rejected };
    await client.query(
      `INSERT INTO sync_push_response_cache (device_id, batch_id, response_json)
       VALUES ($1, $2, $3::jsonb)`,
      [device_id, batch_id, JSON.stringify(response)]
    );

    await client.query('COMMIT');

    return response;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = applySyncBatch;
