// GET /api/stations — list all stations (admin JWT auth)
// GET /api/stations/:station_code/sync-down?since=<ISO timestamp>
//   Auth: service-to-service API key (see shared/middleware/serviceAuth.middleware.js)
//
// Station servers pull this on their own schedule to cache `personnel`
// and `expeditions` locally so field ops keep working offline. This is
// a pull-only endpoint — the central server never pushes to a station.
const express = require('express');
const pool = require('../../../shared/config/db');
const { requireAuth } = require('../../../shared/middleware/auth.middleware');
const requireStationApiKey = require('../../../shared/middleware/serviceAuth.middleware');
const { getSyncDownPayload } = require('../service/syncDown.service');

const router = express.Router();

router.get('/', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM stations ORDER BY code');
    return res.json(rows);
  } catch (err) {
    console.error('[stations] list failed:', err);
    return res.status(500).json({ error: 'query_failed' });
  }
});

router.get('/:station_code/sync-down', requireStationApiKey, async (req, res) => {
  const { station_code: stationCode } = req.params;
  const { since } = req.query;

  if (since !== undefined) {
    const parsed = new Date(since);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'invalid_since', detail: '`since` must be a valid ISO 8601 timestamp' });
    }
  }

  try {
    const payload = await getSyncDownPayload(pool, { stationCode, since });
    if (!payload) {
      return res.status(404).json({ error: 'unknown_station', station_code: stationCode });
    }

    const { station: _station, ...body } = payload;
    return res.json(body);
  } catch (err) {
    console.error(`[stations] sync-down failed for station_code=${stationCode}:`, err);
    return res.status(500).json({ error: 'sync_down_failed' });
  }
});

module.exports = router;
