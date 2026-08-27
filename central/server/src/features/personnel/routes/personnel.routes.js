const express = require('express');
const pool = require('../../../shared/config/db');
const { requireAuth } = require('../../../shared/middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { station_id, status } = req.query;
  const conditions = ['p.is_deleted = false'];
  const params = [];
  let idx = 1;

  if (station_id) {
    conditions.push(`p.origin_station_id = $${idx++}`);
    params.push(station_id);
  }
  if (status) {
    conditions.push(`p.status = $${idx++}`);
    params.push(status);
  }

  try {
    const { rows } = await pool.query(
      `SELECT p.*, s.name as station_name
       FROM personnel p
       LEFT JOIN stations s ON p.origin_station_id = s.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.full_name`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[personnel] list failed:', err);
    return res.status(500).json({ error: 'query_failed' });
  }
});

module.exports = router;
