const express = require('express');
const pool = require('../../../shared/config/db');
const { requireAuth, requireMinRole } = require('../../../shared/middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT e.*, s.name as station_name FROM expeditions e LEFT JOIN stations s ON e.station_id = s.id ORDER BY e.start_date DESC'
    );
    return res.json(rows);
  } catch (err) {
    console.error('[expeditions] list failed:', err);
    return res.status(500).json({ error: 'query_failed' });
  }
});

router.post('/', requireMinRole('ops_manager'), async (req, res) => {
  const { name, station_id, start_date, end_date, status, resource_plan } = req.body;
  if (!name || !station_id || !start_date) {
    return res.status(400).json({ error: 'name_station_id_start_date_required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO expeditions (name, station_id, start_date, end_date, status, resource_plan, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, station_id, start_date, end_date || null, status || 'planned', resource_plan || null, req.adminUser.id]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[expeditions] create failed:', err);
    return res.status(500).json({ error: 'create_failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT e.*, s.name as station_name FROM expeditions e LEFT JOIN stations s ON e.station_id = s.id WHERE e.id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[expeditions] get failed:', err);
    return res.status(500).json({ error: 'query_failed' });
  }
});

router.get('/:id/legs', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM expedition_legs WHERE expedition_id = $1 ORDER BY sequence',
      [req.params.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[expeditions] legs list failed:', err);
    return res.status(500).json({ error: 'query_failed' });
  }
});

router.post('/:id/legs', requireMinRole('ops_manager'), async (req, res) => {
  const { sequence, mode, origin, destination, planned_departure, planned_arrival } = req.body;
  if (sequence === undefined || !mode) {
    return res.status(400).json({ error: 'sequence_and_mode_required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO expedition_legs (expedition_id, sequence, mode, origin, destination, planned_departure, planned_arrival)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, sequence, mode, origin || null, destination || null, planned_departure || null, planned_arrival || null]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[expeditions] leg create failed:', err);
    return res.status(500).json({ error: 'create_failed' });
  }
});

module.exports = router;
