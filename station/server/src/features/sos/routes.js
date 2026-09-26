const express = require('express');
const router = express.Router();
const { listSOS, getSOSById } = require('./repository');
const writeWithOutbox = require('../sync/outbox/writeWithOutbox');
const pool = require('../../shared/config/db');

const PATCHABLE_FIELDS = ['status', 'acknowledged_at', 'resolved_at'];
const VALID_STATUSES = ['reported', 'acknowledged', 'resolved'];

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

    // Only allow patching specific fields
    const updates = {};
    for (const field of PATCHABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.status && !VALID_STATUSES.includes(updates.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Invalid status: ${updates.status}. Must be one of: ${VALID_STATUSES.join(', ')}` } });
    }

    if (Object.keys(updates).length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const updatedFields = { ...existing, ...updates, id: existing.id };

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
