const express = require('express');
const router = express.Router();
const { listCargo } = require('./repository');

/**
 * GET /api/cargo
 * List cargo shipments and items (station-scoped implicitly).
 */
router.get('/', async (_req, res) => {
  try {
    const cargo = await listCargo();
    return res.json(cargo);
  } catch (err) {
    console.error('[cargo] list error:', err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

module.exports = router;
