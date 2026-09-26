require('dotenv').config();
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const app = require('../../../app');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SECRET = process.env.DEVICE_JWT_SECRET || 'change-me';

const TEST_DEVICE_ID = '11111111-1111-1111-1111-111111111111';
const TEST_PERSONNEL_ID = '22222222-2222-2222-2222-222222222222';
const TEST_BATCH_ID = '33333333-3333-3333-3333-333333333333';

let token;

beforeAll(async () => {
  // Seed personnel_cache and devices (FK references)
  await pool.query(
    `INSERT INTO personnel_cache (id, employee_code, full_name, role)
     VALUES ($1, 'TEST-DEV-EMP', 'Test Device User', 'field_personnel')
     ON CONFLICT (id) DO NOTHING`,
    [TEST_PERSONNEL_ID]
  );
  await pool.query(
    `INSERT INTO devices (id, personnel_id, platform, app_version)
     VALUES ($1, $2, 'android', '1.0.0')
     ON CONFLICT (id) DO NOTHING`,
    [TEST_DEVICE_ID, TEST_PERSONNEL_ID]
  );

  // Create a valid JWT for the test device
  token = jwt.sign(
    { device_id: TEST_DEVICE_ID, personnel_id: TEST_PERSONNEL_ID },
    SECRET,
    { expiresIn: '1h' }
  );
});

afterEach(async () => {
  // Clean up test data
  await pool.query("DELETE FROM sync_push_response_cache WHERE device_id = $1", [TEST_DEVICE_ID]);
  await pool.query("DELETE FROM inbound_phone_batches WHERE device_id = $1", [TEST_DEVICE_ID]);
  await pool.query("DELETE FROM outbound_sync_events WHERE entity_id::text = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'");
  await pool.query("DELETE FROM cargo_shipments WHERE id::text = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'");
  await pool.query("DELETE FROM sos_incidents WHERE id::text = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'");
  await pool.query("DELETE FROM outbound_sync_events WHERE entity_id::text = 'ffffffff-1111-2222-3333-444444444444'");
  await pool.query("DELETE FROM cargo_items WHERE id::text = 'ffffffff-1111-2222-3333-444444444444'");
});

afterAll(async () => {
  await pool.end();
});

function makePayload(overrides = {}) {
  return {
    device_id: TEST_DEVICE_ID,
    batch_id: TEST_BATCH_ID,
    records: [
      {
        entity_table: 'cargo_shipments',
        entity_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        operation: 'insert',
        payload: {
          id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          shipment_code: `TEST-SHIP-${Date.now()}`,
          origin: 'Test Origin',
          status: 'in_transit',
          client_updated_at: new Date().toISOString(),
        },
      },
    ],
    ...overrides,
  };
}

describe('POST /api/sync/push', () => {
  test('1: valid batch with one cargo_shipments insert → 200, applied', async () => {
    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${token}`)
      .send(makePayload());

    expect(res.status).toBe(200);
    expect(res.body.batch_id).toBe(TEST_BATCH_ID);
    expect(res.body.status).toBe('applied');
    expect(res.body.accepted).toContain('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(res.body.rejected).toHaveLength(0);

    // Verify the row actually landed in cargo_shipments
    const row = await pool.query(
      'SELECT * FROM cargo_shipments WHERE id = $1',
      ['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee']
    );
    expect(row.rows.length).toBe(1);

    // Verify outbound_sync_events was created
    const outbox = await pool.query(
      "SELECT * FROM outbound_sync_events WHERE entity_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'"
    );
    expect(outbox.rows.length).toBe(1);
  });

  test('2: same (device_id, batch_id) sent twice → idempotent, returns cached response', async () => {
    const payload = makePayload();

    // First call
    const res1 = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res1.status).toBe(200);
    expect(res1.body.status).toBe('applied');

    // Second call with same batch_id
    const res2 = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res2.status).toBe(200);
    expect(res2.body).toEqual(res1.body); // identical cached response

    // Verify no duplicate rows — cargo_shipments should still have exactly 1 row
    const cargoCount = await pool.query(
      "SELECT count(*) FROM cargo_shipments WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'"
    );
    expect(parseInt(cargoCount.rows[0].count)).toBe(1);

    // Verify outbound_sync_events still has exactly 1 row for this entity
    const outboxCount = await pool.query(
      "SELECT count(*) FROM outbound_sync_events WHERE entity_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'"
    );
    expect(parseInt(outboxCount.rows[0].count)).toBe(1);
  });

  test('3: batch with one valid + one invalid record → 200, partial', async () => {
    const payload = {
      device_id: TEST_DEVICE_ID,
      batch_id: '44444444-4444-4444-4444-444444444444',
      records: [
        {
          entity_table: 'cargo_shipments',
          entity_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          operation: 'insert',
          payload: {
            id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            shipment_code: `TEST-PARTIAL-${Date.now()}`,
            status: 'in_transit',
            client_updated_at: new Date().toISOString(),
          },
        },
        {
          entity_table: 'nonexistent_table',
          entity_id: 'ffffffff-1111-2222-3333-444444444444',
          operation: 'insert',
          payload: { id: 'ffffffff-1111-2222-3333-444444444444' },
        },
      ],
    };

    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('partial');
    expect(res.body.accepted).toContain('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(res.body.rejected).toHaveLength(1);
    expect(res.body.rejected[0].entity_id).toBe('ffffffff-1111-2222-3333-444444444444');
    expect(res.body.rejected[0].reason).toMatch(/Unknown entity_table/);
  });

  test('4: missing bearer token → 401', async () => {
    const res = await request(app)
      .post('/api/sync/push')
      .send(makePayload());

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('5: token device_id does not match body device_id → 403', async () => {
    const wrongToken = jwt.sign(
      { device_id: '99999999-9999-9999-9999-999999999999', personnel_id: TEST_PERSONNEL_ID },
      SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${wrongToken}`)
      .send(makePayload());

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('DEVICE_MISMATCH');
  });

  test('6: SOS record creates outbox event with priority=immediate', async () => {
    const sosBatchId = '55555555-5555-5555-5555-555555555555';
    const sosEntityId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const payload = {
      device_id: TEST_DEVICE_ID,
      batch_id: sosBatchId,
      records: [
        {
          entity_table: 'sos_incidents',
          entity_id: sosEntityId,
          operation: 'insert',
          payload: {
            id: sosEntityId,
            personnel_id: TEST_PERSONNEL_ID,
            incident_type: 'medical',
            severity: 'critical',
            reported_at: new Date().toISOString(),
          },
        },
      ],
    };

    // Clean up SOS-specific test data first
    await pool.query("DELETE FROM outbound_sync_events WHERE entity_id = $1", [sosEntityId]);
    await pool.query("DELETE FROM sos_incidents WHERE id = $1", [sosEntityId]);

    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('applied');

    // Verify the outbox event has immediate priority
    const outbox = await pool.query(
      'SELECT * FROM outbound_sync_events WHERE entity_id = $1',
      [sosEntityId]
    );
    expect(outbox.rows.length).toBe(1);
    expect(outbox.rows[0].priority).toBe('immediate');
  });

  test('7: invalid body → 400 with validation error (valid auth, bad body)', async () => {
    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${token}`)
      .send({
        device_id: TEST_DEVICE_ID,
        batch_id: 'not-a-uuid',
        records: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('8: unknown device_id → 200 with failed status, all rejected', async () => {
    const unknownToken = jwt.sign(
      { device_id: '00000000-0000-0000-0000-000000000000', personnel_id: TEST_PERSONNEL_ID },
      SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${unknownToken}`)
      .send(makePayload({
        device_id: '00000000-0000-0000-0000-000000000000',
      }));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('failed');
    expect(res.body.rejected.length).toBeGreaterThan(0);
    expect(res.body.rejected[0].reason).toMatch(/Unknown device_id/);
  });
});
