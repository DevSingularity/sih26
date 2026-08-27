const express = require('express');
const pool = require('../../../shared/config/db');
const { requireAuth } = require('../../../shared/middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/:id/snapshot', async (req, res) => {
  try {
    const stationId = req.params.id;

    const [cargo, inventory, personnel, resources, alerts] = await Promise.all([
      pool.query(
        `SELECT status, COUNT(*) as count FROM cargo_items
         WHERE station_id = $1 AND is_deleted = false GROUP BY status`,
        [stationId]
      ),
      pool.query(
        `SELECT item_category, SUM(quantity_on_hand) as total_quantity
         FROM inventory_stock WHERE station_id = $1 AND is_deleted = false
         GROUP BY item_category`,
        [stationId]
      ),
      pool.query(
        `SELECT status, COUNT(*) as count FROM personnel
         WHERE origin_station_id = $1 AND is_deleted = false GROUP BY status`,
        [stationId]
      ),
      pool.query(
        `SELECT resource_type, status, COUNT(*) as count
         FROM resources WHERE station_id = $1 GROUP BY resource_type, status`,
        [stationId]
      ),
      pool.query(
        `SELECT COUNT(*) as open_count FROM alerts
         WHERE station_id = $1 AND status = 'open'`,
        [stationId]
      ),
    ]);

    const snapshot = {
      station_id: stationId,
      snapshot_at: new Date().toISOString(),
      cargo_summary: cargo.rows,
      inventory_summary: inventory.rows,
      personnel_count: personnel.rows.reduce((sum, r) => sum + parseInt(r.count), 0),
      personnel_by_status: personnel.rows,
      resource_summary: resources.rows,
      active_alerts_count: parseInt(alerts.rows[0].open_count),
    };

    return res.json(snapshot);
  } catch (err) {
    console.error('[stations] snapshot failed:', err);
    return res.status(500).json({ error: 'snapshot_failed' });
  }
});

module.exports = router;
