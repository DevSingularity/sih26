const express = require('express');
const router = express.Router();
const { getSyncHealth } = require('../repository');

/**
 * GET /api/sync-health
 * Returns sync health stats: pending outbox count, last Kafka produce time,
 * last successful sync-down time.
 */
router.get('/', async (_req, res) => {
  try {
    const health = await getSyncHealth();
    return res.json(health);
  } catch (err) {
    console.error('[sync-health] error:', err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

module.exports = router;
