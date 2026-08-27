const express = require('express');
const router = express.Router();
const { listSOS, getSOSById, updateSOS } = require('./repository');
const writeWithOutbox = require('../sync/outbox/writeWithOutbox');
const pool = require('../../shared/config/db');

/**
 * GET /api/sos
 * List SOS incidents, filterable by ?status=, sorted unresolved first.
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const incidents = await listSOS(status);
    return res.json(incidents);
  } catch (err) {
    console.error('[sos] list error:', err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

/**
 * GET /api/sos/:id
 * Get a single SOS incident by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const incident = await getSOSById(req.params.id);
    if (!incident) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'SOS incident not found' } });
    return res.json(incident);
  } catch (err) {
    console.error('[sos] get error:', err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

/**
 * PATCH /api/sos/:id
 * Commander updates status/acknowledged_at/resolved_at.
 * This is a WRITE — goes through writeWithOutbox so India eventually sees it.
 */
router.patch('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await getSOSById(req.params.id);
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'SOS incident not found' } });
    }

    const updatedFields = { ...existing, ...req.body, id: existing.id };

    await writeWithOutbox(client, {
      table: 'sos_incidents',
      id: existing.id,
      operation: 'update',
      row: updatedFields,
      priority: 'immediate',
    });

    await client.query('COMMIT');

    const updated = await getSOSById(req.params.id);
    return res.json(updated);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sos] update error:', err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  } finally {
    client.release();
  }
});

module.exports = router;
