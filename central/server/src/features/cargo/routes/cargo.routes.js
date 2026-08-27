const express = require('express');
const pool = require('../../../shared/config/db');
const { requireAuth } = require('../../../shared/middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/shipments', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cs.*, s.name as destination_station_name
       FROM cargo_shipments cs
       LEFT JOIN stations s ON cs.destination_station_id = s.id
       WHERE cs.is_deleted = false
       ORDER BY cs.created_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[cargo] shipments list failed:', err);
    return res.status(500).json({ error: 'query_failed' });
  }
});

router.get('/items', async (req, res) => {
  const { station_id, status } = req.query;
  const conditions = ['ci.is_deleted = false'];
  const params = [];
  let idx = 1;

  if (station_id) {
    conditions.push(`ci.station_id = $${idx++}`);
    params.push(station_id);
  }
  if (status) {
    conditions.push(`ci.status = $${idx++}`);
    params.push(status);
  }

  try {
    const { rows } = await pool.query(
      `SELECT ci.*, s.name as station_name, cs.shipment_code
       FROM cargo_items ci
       LEFT JOIN stations s ON ci.station_id = s.id
       LEFT JOIN cargo_shipments cs ON ci.shipment_id = cs.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ci.created_at DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[cargo] items list failed:', err);
    return res.status(500).json({ error: 'query_failed' });
  }
});

module.exports = router;
