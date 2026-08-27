const express = require('express');
const pool = require('../../../shared/config/db');
const { requireAuth } = require('../../../shared/middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/usage', async (req, res) => {
  const { station_id, from, to } = req.query;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (station_id) {
    conditions.push(`rul.station_id = $${idx++}`);
    params.push(station_id);
  }
  if (from) {
    conditions.push(`rul.occurred_at >= $${idx++}`);
    params.push(from);
  }
  if (to) {
    conditions.push(`rul.occurred_at <= $${idx++}`);
    params.push(to);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT rul.*, r.name as resource_name, r.resource_type, s.name as station_name
       FROM resource_usage_logs rul
       LEFT JOIN resources r ON rul.resource_id = r.id
       LEFT JOIN stations s ON rul.station_id = s.id
       ${where}
       ORDER BY rul.occurred_at DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[resources] usage list failed:', err);
    return res.status(500).json({ error: 'query_failed' });
  }
});

router.get('/', async (req, res) => {
  const { station_id } = req.query;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (station_id) {
    conditions.push(`r.station_id = $${idx++}`);
    params.push(station_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT r.*, s.name as station_name
       FROM resources r
       LEFT JOIN stations s ON r.station_id = s.id
       ${where}
       ORDER BY r.resource_type, r.name`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[resources] list failed:', err);
    return res.status(500).json({ error: 'query_failed' });
  }
});

module.exports = router;
