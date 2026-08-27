const express = require('express');
const pool = require('../../../shared/config/db');
const { requireAuth } = require('../../../shared/middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { status, station_id } = req.query;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (status) {
    conditions.push(`si.status = $${idx++}`);
    params.push(status);
  } else {
    conditions.push(`si.status <> 'resolved'`);
  }
  if (station_id) {
    conditions.push(`si.station_id = $${idx++}`);
    params.push(station_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT si.*, p.full_name as personnel_name, s.name as station_name
       FROM sos_incidents si
       LEFT JOIN personnel p ON si.personnel_id = p.id
       LEFT JOIN stations s ON si.station_id = s.id
       ${where}
       ORDER BY si.reported_at DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[sos] list failed:', err);
    return res.status(500).json({ error: 'query_failed' });
  }
});

router.post('/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE sos_incidents SET status = 'acknowledged', acknowledged_at = now()
       WHERE id = $1 AND status = 'reported' RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'not_found_or_already_acknowledged' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[sos] acknowledge failed:', err);
    return res.status(500).json({ error: 'update_failed' });
  }
});

router.post('/:id/resolve', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE sos_incidents SET status = 'resolved', resolved_at = now()
       WHERE id = $1 AND status IN ('acknowledged','in_progress') RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'not_found_or_not_resolvable' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[sos] resolve failed:', err);
    return res.status(500).json({ error: 'update_failed' });
  }
});

module.exports = router;
