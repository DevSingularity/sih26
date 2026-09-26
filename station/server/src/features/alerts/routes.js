const express = require('express');
const router = express.Router();
const { listAlerts } = require('./repository');

/**
 * GET /api/alerts
 * List local threshold alerts, most recent first.
 */
router.get('/', async (_req, res) => {
  try {
    const alerts = await listAlerts();
    return res.json(alerts);
  } catch (err) {
    console.error('[alerts] list error:', err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

module.exports = router;
