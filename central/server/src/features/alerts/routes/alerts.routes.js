const express = require('express');
const pool = require('../../../shared/config/db');
const { requireAuth } = require('../../../shared/middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { station_id, status } = req.query;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (station_id) {
    conditions.push(`a.station_id = $${idx++}`);
    params.push(station_id);
  }
  if (status) {
    conditions.push(`a.status = $${idx++}`);
    params.push(status);
  } else {
    conditions.push(`a.status = 'open'`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT a.*, s.name as station_name
       FROM alerts a
       LEFT JOIN stations s ON a.station_id = s.id
       ${where}
       ORDER BY a.created_at DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[alerts] list failed:', err);
    return res.status(500).json({ error: 'query_failed' });
  }
});

router.post('/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE alerts SET status = 'acknowledged'
       WHERE id = $1 AND status = 'open' RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'not_found_or_already_acknowledged' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[alerts] acknowledge failed:', err);
    return res.status(500).json({ error: 'update_failed' });
  }
});

router.post('/:id/resolve', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE alerts SET status = 'resolved', resolved_at = now()
       WHERE id = $1 AND status IN ('open','acknowledged') RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'not_found_or_not_resolvable' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[alerts] resolve failed:', err);
    return res.status(500).json({ error: 'update_failed' });
  }
});

module.exports = router;
