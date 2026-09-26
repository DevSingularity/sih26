const express = require('express');
const pool = require('../../../shared/config/db');
const { requireAuth, requireMinRole } = require('../../../shared/middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { station_id } = req.query;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (station_id) {
    conditions.push(`rt.station_id = $${idx++}`);
    params.push(station_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT rt.*, s.name as station_name
       FROM risk_thresholds rt
       LEFT JOIN stations s ON rt.station_id = s.id
       ${where}
       ORDER BY rt.metric`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[risk-thresholds] list failed:', err);
    return res.status(500).json({ error: 'query_failed' });
  }
});

router.post('/', requireMinRole('ops_manager'), async (req, res) => {
  const { station_id, metric, warning_value, critical_value } = req.body;
  if (!station_id || !metric) {
    return res.status(400).json({ error: 'station_id_and_metric_required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO risk_thresholds (station_id, metric, warning_value, critical_value, updated_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [station_id, metric, warning_value || null, critical_value || null, req.adminUser.id]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[risk-thresholds] create failed:', err);
    return res.status(500).json({ error: 'create_failed' });
  }
});

router.put('/:id', requireMinRole('ops_manager'), async (req, res) => {
  const { warning_value, critical_value } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE risk_thresholds
       SET warning_value = COALESCE($1, warning_value),
           critical_value = COALESCE($2, critical_value),
           updated_by = $3,
           updated_at = now()
       WHERE id = $4 RETURNING *`,
      [warning_value, critical_value, req.adminUser.id, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[risk-thresholds] update failed:', err);
    return res.status(500).json({ error: 'update_failed' });
  }
});

module.exports = router;
