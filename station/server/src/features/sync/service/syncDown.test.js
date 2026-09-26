require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

// Mock axios BEFORE requiring syncDown
jest.mock('axios');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const syncDown = require('./syncDown');

afterEach(async () => {
  jest.clearAllMocks();
  // Clean up test data
  await pool.query("DELETE FROM sync_down_runs WHERE status IN ('success', 'failed') AND records_pulled IS NOT NULL");
  await pool.query("DELETE FROM personnel_cache WHERE employee_code LIKE 'TEST-SD-%'");
  await pool.query("DELETE FROM expedition_cache WHERE name LIKE 'Test Expedition %'");
});

afterAll(async () => {
  await pool.end();
});

describe('syncDown', () => {
  test('1: successful pull upserts personnel and expedition data', async () => {
    const personnelId = 'aaaaaaaa-0001-0001-0001-000000000001';
    const expeditionId = 'aaaaaaaa-0002-0002-0002-000000000002';

    // Mock the central server response
    axios.get.mockResolvedValueOnce({
      data: {
        personnel: [
          {
            id: personnelId,
            employee_code: 'TEST-SD-001',
            full_name: 'Test SyncDown User',
            role: 'field_personnel',
            designation: 'Engineer',
            phone: '+1234567890',
            status: 'active',
          },
        ],
        expeditions: [
          {
            id: expeditionId,
            name: 'Test Expedition 2026',
            start_date: '2026-01-15',
            end_date: '2026-03-15',
            status: 'active',
            resource_plan: { fuel: 500, power: 200 },
          },
        ],
      },
    });

    const result = await syncDown();

    expect(result.status).toBe('success');
    expect(result.records_pulled).toBe(2);

    // Verify personnel was upserted
    const personnel = await pool.query('SELECT * FROM personnel_cache WHERE id = $1', [personnelId]);
    expect(personnel.rows.length).toBe(1);
    expect(personnel.rows[0].full_name).toBe('Test SyncDown User');

    // Verify expedition was upserted
    const expedition = await pool.query('SELECT * FROM expedition_cache WHERE id = $1', [expeditionId]);
    expect(expedition.rows.length).toBe(1);
    expect(expedition.rows[0].name).toBe('Test Expedition 2026');

    // Verify sync_down_runs recorded success
    const runs = await pool.query(
      "SELECT * FROM sync_down_runs WHERE status = 'success' ORDER BY requested_at DESC LIMIT 1"
    );
    expect(runs.rows.length).toBe(1);
    expect(runs.rows[0].records_pulled).toBe(2);
    expect(runs.rows[0].completed_at).not.toBeNull();
  });

  test('2: network error records failed run, does not throw', async () => {
    axios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await syncDown();

    expect(result.status).toBe('failed');
    expect(result.error).toBe('ECONNREFUSED');

    // Verify sync_down_runs recorded failure
    const runs = await pool.query(
      "SELECT * FROM sync_down_runs WHERE status = 'failed' ORDER BY requested_at DESC LIMIT 1"
    );
    expect(runs.rows.length).toBe(1);
    expect(runs.rows[0].error_message).toBe('ECONNREFUSED');
  });

  test('3: second run uses since param from first successful run', async () => {
    // First run: success
    axios.get.mockResolvedValueOnce({ data: { personnel: [], expeditions: [] } });
    const result1 = await syncDown();
    expect(result1.status).toBe('success');

    // Get the first run's completed_at
    const firstRun = await pool.query(
      "SELECT completed_at FROM sync_down_runs WHERE status = 'success' ORDER BY completed_at ASC LIMIT 1"
    );
    const firstCompletedAt = firstRun.rows[0].completed_at;

    // Second run: should pass 'since' param >= firstCompletedAt
    axios.get.mockResolvedValueOnce({ data: { personnel: [], expeditions: [] } });
    const result2 = await syncDown();
    expect(result2.status).toBe('success');

    // Verify axios was called with a 'since' param
    const callArgs = axios.get.mock.calls[1][1];
    expect(callArgs.params.since).toBeDefined();
    // The since param should be >= the first run's completed_at
    expect(new Date(callArgs.params.since).getTime()).toBeGreaterThanOrEqual(firstCompletedAt.getTime());
  });
});
