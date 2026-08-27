require('dotenv').config();
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const app = require('../app');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SECRET = process.env.DEVICE_JWT_SECRET || 'change-me';

const TEST_DEVICE_ID = '88888888-8888-8888-8888-888888888888';
const TEST_PERSONNEL_ID = '99999999-9999-9999-9999-999999999999';
const TEST_SOS_ID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';

let token;

beforeAll(async () => {
  await pool.query(
    `INSERT INTO personnel_cache (id, employee_code, full_name, role)
     VALUES ($1, 'TEST-UI-EMP', 'Test UI User', 'field_personnel')
     ON CONFLICT (id) DO NOTHING`,
    [TEST_PERSONNEL_ID]
  );
  await pool.query(
    `INSERT INTO devices (id, personnel_id, platform, app_version)
     VALUES ($1, $2, 'android', '1.0.0')
     ON CONFLICT (id) DO NOTHING`,
    [TEST_DEVICE_ID, TEST_PERSONNEL_ID]
  );
  token = jwt.sign({ device_id: TEST_DEVICE_ID, personnel_id: TEST_PERSONNEL_ID }, SECRET, { expiresIn: '1h' });
});

beforeEach(async () => {
  // Re-seed SOS incident before each test (afterEach deletes it)
  await pool.query(
    `INSERT INTO sos_incidents (id, personnel_id, incident_type, severity, status, reported_at)
     VALUES ($1, $2, 'medical', 'high', 'reported', now())
     ON CONFLICT (id) DO NOTHING`,
    [TEST_SOS_ID, TEST_PERSONNEL_ID]
  );
});

afterEach(async () => {
  await pool.query("DELETE FROM outbound_sync_events WHERE entity_id = $1", [TEST_SOS_ID]);
  await pool.query("DELETE FROM sos_incidents WHERE id = $1", [TEST_SOS_ID]);
});

afterAll(async () => {
  await pool.end();
});

describe('GET /api/sos', () => {
  test('returns SOS incidents list', async () => {
    const res = await request(app).get('/api/sos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('filters by status', async () => {
    const res = await request(app).get('/api/sos?status=reported');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(inc => expect(inc.status).toBe('reported'));
  });
});

describe('PATCH /api/sos/:id', () => {
  test('updates SOS status and creates outbox event', async () => {
    const res = await request(app)
      .patch(`/api/sos/${TEST_SOS_ID}`)
      .send({ status: 'acknowledged', acknowledged_at: new Date().toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('acknowledged');

    // Verify outbox event was created
    const outbox = await pool.query(
      'SELECT * FROM outbound_sync_events WHERE entity_id = $1',
      [TEST_SOS_ID]
    );
    expect(outbox.rows.length).toBe(1);
    expect(outbox.rows[0].priority).toBe('immediate');
  });

  test('returns 404 for unknown SOS id', async () => {
    const res = await request(app)
      .patch('/api/sos/00000000-0000-0000-0000-000000000000')
      .send({ status: 'resolved' });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/sync-health', () => {
  test('returns sync health stats', async () => {
    const res = await request(app).get('/api/sync-health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pending_outbox_count');
    expect(res.body).toHaveProperty('last_kafka_produce_at');
    expect(res.body).toHaveProperty('last_sync_down');
  });
});

describe('GET /api/alerts', () => {
  test('returns alerts list', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/cargo', () => {
  test('returns cargo shipments and items', async () => {
    const res = await request(app).get('/api/cargo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('shipments');
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.shipments)).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});

describe('GET /api/dashboard/summary', () => {
  test('returns dashboard summary', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('cargo_by_status');
    expect(res.body).toHaveProperty('inventory_levels');
    expect(res.body).toHaveProperty('resource_usage_today');
    expect(res.body).toHaveProperty('checked_in_personnel');
  });
});
