const crypto = require('crypto');
const pool = require('../../shared/config/db');
const writeWithOutbox = require('../sync/outbox/writeWithOutbox');
const thresholdsConfig = require('./thresholds.config');

/**
 * Check resource and inventory levels against thresholds.
 * For each breach: inserts a local_threshold_alerts row via writeWithOutbox
 * (so it syncs upstream), but only if no unacknowledged alert already
 * exists for that metric (avoids spam).
 *
 * Called:
 * - After writes to resources/inventory_stock (inline trigger)
 * - On a node-cron timer as the safety-net fallback
 */
async function checkThresholds(clientPool) {
  const conn = clientPool || pool;

  // 1. Check inventory_stock items against their own reorder_threshold
  const inventoryResult = await conn.query(
    `SELECT id, item_name, item_category, quantity_on_hand, unit, reorder_threshold
     FROM inventory_stock
     WHERE reorder_threshold IS NOT NULL AND is_deleted = false`
  );

  const alertsToRaise = [];

  for (const item of inventoryResult.rows) {
    const qtyOnHand = Number(item.quantity_on_hand);
    const reorderAt = Number(item.reorder_threshold);
    if (qtyOnHand <= reorderAt) {
      const metric = `inventory:${item.item_category}:${item.item_name}`;
      const severity = qtyOnHand <= reorderAt * 0.5 ? 'critical' : 'warning';
      alertsToRaise.push({
        metric,
        current_value: qtyOnHand,
        threshold_value: reorderAt,
        severity,
      });
    }
  }

  // 2. Check resource usage logs for fuel/power levels
  const resourceResult = await conn.query(
    `SELECT id, resource_type, name, capacity, unit, status
     FROM resources
     WHERE status != 'offline'`
  );

  // Fetch latest usage for ALL online resources in a single query
  const resourceIds = resourceResult.rows.map(r => r.id);
  let latestUsageMap = {};

  if (resourceIds.length > 0) {
    const latestUsageResult = await conn.query(
      `SELECT DISTINCT ON (resource_id) resource_id, quantity
       FROM resource_usage_logs
       WHERE resource_id = ANY($1)
       ORDER BY resource_id, occurred_at DESC`,
      [resourceIds]
    );
    for (const row of latestUsageResult.rows) {
      latestUsageMap[row.resource_id] = Number(row.quantity);
    }
  }

  for (const resource of resourceResult.rows) {
    const config = thresholdsConfig[resource.resource_type];
    if (!config) continue;

    const latestQuantity = latestUsageMap[resource.id];
    if (latestQuantity != null && resource.capacity) {
      const currentLevel = Number(resource.capacity) - latestQuantity;
      if (currentLevel <= config.critical) {
        alertsToRaise.push({
          metric: `resource:${resource.resource_type}:${resource.name}`,
          current_value: currentLevel,
          threshold_value: config.critical,
          severity: 'critical',
        });
      } else if (currentLevel <= config.warning) {
        alertsToRaise.push({
          metric: `resource:${resource.resource_type}:${resource.name}`,
          current_value: currentLevel,
          threshold_value: config.warning,
          severity: 'warning',
        });
      }
    }
  }

  // 3. For each breach, check if an unacknowledged alert already exists
  // If not, insert one via writeWithOutbox
  let inserted = 0;
  const client = await conn.connect();
  try {
    await client.query('BEGIN');

    for (const alert of alertsToRaise) {
      // Check for existing unacknowledged alert for this metric
      const existing = await client.query(
        `SELECT id FROM local_threshold_alerts
         WHERE metric = $1 AND acknowledged_at IS NULL`,
        [alert.metric]
      );

      if (existing.rows.length > 0) {
        continue;
      }

      // Insert new alert via the outbox
      const alertId = crypto.randomUUID();
      await writeWithOutbox(client, {
        table: 'local_threshold_alerts',
        id: alertId,
        operation: 'insert',
        row: {
          id: alertId,
          metric: alert.metric,
          current_value: alert.current_value,
          threshold_value: alert.threshold_value,
          severity: alert.severity,
        },
        priority: alert.severity === 'critical' ? 'immediate' : 'normal',
      });
      inserted++;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { checked: alertsToRaise.length, inserted, alerts: alertsToRaise };
}

module.exports = checkThresholds;
