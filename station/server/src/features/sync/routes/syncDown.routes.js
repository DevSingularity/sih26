const express = require('express');
const router = express.Router();
const syncDown = require('../service/syncDown');

/**
 * POST /api/sync-down/trigger
 * Manually triggers a sync-down pull from the central server.
 * Used by the local ops UI's sync health panel.
 *
 * MVP: unauthenticated (the local UI itself is the only client,
 * running on a station-local machine). Auth can be added later.
 */
router.post('/trigger', async (_req, res) => {
  try {
    const result = await syncDown();
    return res.status(200).json(result);
  } catch (err) {
    console.error('[sync-down/trigger] error:', err.message);
    return res.status(500).json({
      error: { code: 'SYNC_DOWN_FAILED', message: err.message },
    });
  }
});

module.exports = router;
