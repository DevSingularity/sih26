const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('./repository');

/**
 * GET /api/dashboard/summary
 * Aggregate dashboard: cargo by status, inventory levels, resource usage, checked-in personnel.
 */
router.get('/summary', async (_req, res) => {
  try {
    const summary = await getDashboardSummary();
    return res.json(summary);
  } catch (err) {
    console.error('[dashboard] summary error:', err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

module.exports = router;
