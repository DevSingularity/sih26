require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const writeWithOutbox = require('./writeWithOutbox');

// uuid is not a dependency yet — use crypto.randomUUID() instead
// (available in Node 19+; or add uuid package)
const generateId = () => crypto.randomUUID();

let pool;
let client;

beforeAll(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  client = await pool.connect();
});

afterAll(async () => {
  if (client) client.release();
  if (pool) await pool.end();
});

afterEach(async () => {
  // Clean up test rows: outbox events first (FK not present but good practice)
  await client.query("DELETE FROM outbound_sync_events WHERE entity_id::text LIKE 'test-%'");
  await client.query("DELETE FROM cargo_shipments WHERE id::text LIKE 'test-%'");
  await client.query("DELETE FROM cargo_items WHERE id::text LIKE 'test-%'");
  await client.query("DELETE FROM sos_incidents WHERE id::text LIKE 'test-%'");
  await client.query("DELETE FROM inventory_stock WHERE id::text LIKE 'test-%'");
});

describe('writeWithOutbox', () => {
  test('1: inserts a cargo_shipments row and creates a matching outbox event', async () => {
    const id = generateId();
    await client.query('BEGIN');

    const shipmentRow = {
      id,
      shipment_code: `TEST-${Date.now()}`,
      origin: 'Test Origin',
      mode: 'ship',
      status: 'in_transit',
    };

    const { row, outboxEventId } = await writeWithOutbox(client, {
      table: 'cargo_shipments',
      id,
      operation: 'insert',
      row: shipmentRow,
    });

    await client.query('COMMIT');

    // Verify the row exists in cargo_shipments
    const cargoResult = await client.query('SELECT * FROM cargo_shipments WHERE id = $1', [id]);
    expect(cargoResult.rows.length).toBe(1);
    expect(cargoResult.rows[0].shipment_code).toBe(shipmentRow.shipment_code);

    // Verify the outbox event exists
    const outboxResult = await client.query('SELECT * FROM outbound_sync_events WHERE id = $1', [outboxEventId]);
    expect(outboxResult.rows.length).toBe(1);
    expect(outboxResult.rows[0].entity_table).toBe('cargo_shipments');
    expect(outboxResult.rows[0].entity_id).toBe(id);
    expect(outboxResult.rows[0].operation).toBe('insert');
    expect(outboxResult.rows[0].kafka_produced_at).toBeNull();
  });

  test('2: updates an existing row and creates a second outbox event (append-only)', async () => {
    const id = generateId();
    await client.query('BEGIN');

    // First insert
    const insertRow = {
      id,
      shipment_code: `TEST-${Date.now()}`,
      origin: 'Test Origin',
      status: 'in_transit',
    };

    const insertResult = await writeWithOutbox(client, {
      table: 'cargo_shipments',
      id,
      operation: 'insert',
      row: insertRow,
    });

    // Now update the same row
    const updateRow = {
      ...insertRow,
      status: 'received',
    };

    const updateResult = await writeWithOutbox(client, {
      table: 'cargo_shipments',
      id,
      operation: 'update',
      row: updateRow,
    });

    await client.query('COMMIT');

    // Verify the row was updated (not duplicated)
    const cargoResult = await client.query('SELECT * FROM cargo_shipments WHERE id = $1', [id]);
    expect(cargoResult.rows.length).toBe(1);
    expect(cargoResult.rows[0].status).toBe('received');

    // Verify two outbox events were created (append-only)
    const outboxResult = await client.query(
      'SELECT * FROM outbound_sync_events WHERE entity_id = $1 ORDER BY created_at ASC',
      [id]
    );
    expect(outboxResult.rows.length).toBe(2);
    expect(outboxResult.rows[0].operation).toBe('insert');
    expect(outboxResult.rows[1].operation).toBe('update');
  });

  test('3: SOS incidents are forced to immediate priority regardless of caller input', async () => {
    const id = generateId();
    await client.query('BEGIN');

    // Insert a personnel_cache row first (SOS has FK to personnel_cache)
    await client.query(
      `INSERT INTO personnel_cache (id, employee_code, full_name, role)
       VALUES ($1, 'TEST-EMP', 'Test Person', 'field_personnel')
       ON CONFLICT (id) DO NOTHING`,
      [generateId()]
    );

    const personnelId = (await client.query(
      "SELECT id FROM personnel_cache WHERE employee_code = 'TEST-EMP' LIMIT 1"
    )).rows[0]?.id;

    const sosRow = {
      id,
      personnel_id: personnelId,
      incident_type: 'medical',
      severity: 'high',
      status: 'reported',
      reported_at: new Date().toISOString(),
    };

    const { outboxEventId } = await writeWithOutbox(client, {
      table: 'sos_incidents',
      id,
      operation: 'insert',
      row: sosRow,
      priority: 'normal', // caller passes 'normal', but should be forced to 'immediate'
    });

    await client.query('COMMIT');

    // Verify the outbox event has immediate priority
    const outboxResult = await client.query('SELECT * FROM outbound_sync_events WHERE id = $1', [outboxEventId]);
    expect(outboxResult.rows.length).toBe(1);
    expect(outboxResult.rows[0].priority).toBe('immediate');
  });

  test('4: throws on unknown table name and writes nothing', async () => {
    await client.query('BEGIN');

    await expect(
      writeWithOutbox(client, {
        table: 'nonexistent_table',
        id: generateId(),
        operation: 'insert',
        row: { id: generateId() },
      })
    ).rejects.toThrow('not a syncable table');

    // Verify no rows were written to outbound_sync_events
    const outboxResult = await client.query(
      "SELECT count(*) FROM outbound_sync_events WHERE entity_table = 'nonexistent_table'"
    );
    expect(parseInt(outboxResult.rows[0].count)).toBe(0);

    await client.query('ROLLBACK');
  });
});
