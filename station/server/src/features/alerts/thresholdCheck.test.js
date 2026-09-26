require('dotenv').config();
const { Pool } = require('pg');
const checkThresholds = require('./thresholdCheck');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Track test IDs for cleanup
const testInventoryIds = [];
const testAlertIds = [];

afterEach(async () => {
  // Clean up test data
  for (const id of testAlertIds) {
    await pool.query("DELETE FROM outbound_sync_events WHERE entity_id = $1", [id]);
    await pool.query("DELETE FROM local_threshold_alerts WHERE id = $1", [id]);
  }
  for (const id of testInventoryIds) {
    await pool.query("DELETE FROM inventory_stock WHERE id = $1", [id]);
  }
  testInventoryIds.length = 0;
  testAlertIds.length = 0;
});

afterAll(async () => {
  await pool.end();
});

describe('checkThresholds', () => {
  test('1: creates alert when inventory below reorder_threshold', async () => {
    const inventoryId = '11111111-aaaa-bbbb-cccc-111111111111';
    testInventoryIds.push(inventoryId);

    // Seed an inventory item below its reorder threshold
    await pool.query(
      `INSERT INTO inventory_stock (id, item_category, item_name, quantity_on_hand, unit, reorder_threshold)
       VALUES ($1, 'fuel', 'Diesel', 10, 'liters', 50)
       ON CONFLICT (id) DO UPDATE SET quantity_on_hand = 10`,
      [inventoryId]
    );

    const result = await checkThresholds(pool);

    expect(result.inserted).toBeGreaterThanOrEqual(1);
    const dieselAlert = result.alerts.find(a => a.metric.includes('Diesel'));
    expect(dieselAlert).toBeDefined();
    expect(dieselAlert.current_value).toBe(10);
    expect(dieselAlert.threshold_value).toBe(50);

    // Verify the alert was written to the DB
    const dbAlert = await pool.query(
      "SELECT * FROM local_threshold_alerts WHERE metric LIKE '%Diesel%' AND acknowledged_at IS NULL ORDER BY raised_at DESC LIMIT 1"
    );
    expect(dbAlert.rows.length).toBe(1);
    testAlertIds.push(dbAlert.rows[0].id);

    // Verify outbox event was created
    const outbox = await pool.query(
      'SELECT * FROM outbound_sync_events WHERE entity_id = $1',
      [dbAlert.rows[0].id]
    );
    expect(outbox.rows.length).toBe(1);
  });

  test('2: does not spam duplicate alerts for same unacknowledged metric', async () => {
    const inventoryId = '22222222-aaaa-bbbb-cccc-222222222222';
    testInventoryIds.push(inventoryId);

    await pool.query(
      `INSERT INTO inventory_stock (id, item_category, item_name, quantity_on_hand, unit, reorder_threshold)
       VALUES ($1, 'food', 'Rations', 5, 'kg', 20)
       ON CONFLICT (id) DO UPDATE SET quantity_on_hand = 5`,
      [inventoryId]
    );

    // First check — should raise an alert
    const result1 = await checkThresholds(pool);
    expect(result1.alerts.length).toBeGreaterThanOrEqual(1);

    // Get the alert ID
    const dbAlert = await pool.query(
      "SELECT id FROM local_threshold_alerts WHERE metric LIKE '%Rations%' AND acknowledged_at IS NULL LIMIT 1"
    );
    expect(dbAlert.rows.length).toBe(1);
    testAlertIds.push(dbAlert.rows[0].id);

    // Second check — should NOT create a second alert (dedup)
    const result2 = await checkThresholds(pool);

    const dbAlerts = await pool.query(
      "SELECT count(*) FROM local_threshold_alerts WHERE metric LIKE '%Rations%' AND acknowledged_at IS NULL"
    );
    expect(parseInt(dbAlerts.rows[0].count)).toBe(1);
  });

  test('3: creates new alert after previous one is acknowledged', async () => {
    const inventoryId = '33333333-aaaa-bbbb-cccc-333333333333';
    testInventoryIds.push(inventoryId);

    await pool.query(
      `INSERT INTO inventory_stock (id, item_category, item_name, quantity_on_hand, unit, reorder_threshold)
       VALUES ($1, 'medical', 'Bandages', 2, 'packs', 10)
       ON CONFLICT (id) DO UPDATE SET quantity_on_hand = 2`,
      [inventoryId]
    );

    // First check — raises alert
    await checkThresholds(pool);

    // Acknowledge the alert
    const dbAlert = await pool.query(
      "SELECT id FROM local_threshold_alerts WHERE metric LIKE '%Bandages%' AND acknowledged_at IS NULL LIMIT 1"
    );
    expect(dbAlert.rows.length).toBe(1);
    testAlertIds.push(dbAlert.rows[0].id);

    await pool.query(
      'UPDATE local_threshold_alerts SET acknowledged_at = now() WHERE id = $1',
      [dbAlert.rows[0].id]
    );

    // Second check — should create a NEW alert (acknowledged one doesn't block)
    await checkThresholds(pool);

    const allAlerts = await pool.query(
      "SELECT id FROM local_threshold_alerts WHERE metric LIKE '%Bandages%' ORDER BY raised_at ASC"
    );
    expect(parseInt(allAlerts.rows.length)).toBe(2);
    for (const row of allAlerts.rows) {
      if (!testAlertIds.includes(row.id)) {
        testAlertIds.push(row.id);
      }
    }
  });
});
