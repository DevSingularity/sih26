const express = require('express');
const pool = require('../../../shared/config/db');
const { requireAuth } = require('../../../shared/middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { station_id } = req.query;
  const conditions = ['is_deleted = false'];
  const params = [];
  let idx = 1;

  if (station_id) {
    conditions.push(`station_id = $${idx++}`);
    params.push(station_id);
  }

  try {
    const { rows } = await pool.query(
      `SELECT i.*, s.name as station_name
       FROM inventory_stock i
       LEFT JOIN stations s ON i.station_id = s.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY i.item_category, i.item_name`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[inventory] list failed:', err);
    return res.status(500).json({ error: 'query_failed' });
  }
});

module.exports = router;
