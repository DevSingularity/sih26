const SYNCABLE_TABLES = new Set([
  'cargo_shipments',
  'cargo_items',
  'inventory_stock',
  'inventory_transactions',
  'resource_usage_logs',
  'field_updates',
  'location_tracks',
  'sos_incidents',
  'local_threshold_alerts',
]);

module.exports.SYNCABLE_TABLES = SYNCABLE_TABLES;

module.exports = async function writeWithOutbox(client, { table, id, operation, row, priority = 'normal' }) {
  if (!SYNCABLE_TABLES.has(table)) {
    throw new Error(`writeWithOutbox: table "${table}" is not a syncable table`);
  }
  if (operation !== 'insert' && operation !== 'update') {
    throw new Error(`writeWithOutbox: operation must be 'insert' or 'update', got '${operation}'`);
  }
  if (!id) {
    throw new Error('writeWithOutbox: id is required');
  }
  if (!row || typeof row !== 'object') {
    throw new Error('writeWithOutbox: row must be a non-null object');
  }

  // Force immediate priority for SOS incidents
  const effectivePriority = table === 'sos_incidents' ? 'immediate' : priority;

  // Build dynamic INSERT ... ON CONFLICT (id) DO UPDATE from the row keys
  const keys = Object.keys(row).filter(k => row[k] !== undefined);
  if (keys.length === 0) {
    throw new Error('writeWithOutbox: row must have at least one column to write');
  }

  const colList = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const updateSet = keys
    .filter(k => k !== 'id')
    .map(k => `"${k}" = EXCLUDED."${k}"`)
    .join(', ');
  const values = keys.map(k => row[k]);

  const upsertSql = `
    INSERT INTO ${table} (${colList})
    VALUES (${placeholders})
    ON CONFLICT (id) DO UPDATE SET ${updateSet}
    RETURNING *
  `;

  const result = await client.query(upsertSql, values);
  const writtenRow = result.rows[0];

  // Insert the outbox event in the same transaction
  const outboxSql = `
    INSERT INTO outbound_sync_events (entity_table, entity_id, operation, payload, priority)
    VALUES ($1, $2, $3, $4::jsonb, $5)
    RETURNING id
  `;
  const outboxResult = await client.query(outboxSql, [
    table,
    id,
    operation,
    JSON.stringify(writtenRow),
    effectivePriority,
  ]);

  return {
    row: writtenRow,
    outboxEventId: outboxResult.rows[0].id,
  };
};
