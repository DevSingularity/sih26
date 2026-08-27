const pool = require('../../shared/config/db');

async function getDashboardSummary() {
  const today = new Date().toISOString().split('T')[0];

  const [cargoByStatus, inventoryLevels, resourceUsage, recentPersonnel] = await Promise.all([
    // Today's cargo item count by status
    pool.query(
      `SELECT status, count(*) as count FROM cargo_items
       WHERE scanned_at >= $1::date
       GROUP BY status`,
      [today]
    ),
    // Current inventory levels
    pool.query(
      'SELECT item_category, item_name, quantity_on_hand, unit, reorder_threshold FROM inventory_stock ORDER BY item_category, item_name'
    ),
    // Today's resource usage sum by type
    pool.query(
      `SELECT usage_type, sum(quantity) as total_quantity, unit
       FROM resource_usage_logs
       WHERE occurred_at >= $1::date
       GROUP BY usage_type, unit`,
      [today]
    ),
    // Personnel with recent location tracks (checked in within last 8 hours)
    pool.query(
      `SELECT DISTINCT p.id, p.full_name, p.role, lt.track_ended_at
       FROM personnel_cache p
       INNER JOIN location_tracks lt ON lt.personnel_id = p.id
       WHERE lt.track_ended_at >= now() - interval '8 hours'
       ORDER BY lt.track_ended_at DESC`
    ),
  ]);

  return {
    cargo_by_status: cargoByStatus.rows,
    inventory_levels: inventoryLevels.rows,
    resource_usage_today: resourceUsage.rows,
    checked_in_personnel: recentPersonnel.rows,
  };
}

module.exports = { getDashboardSummary };
