const express = require('express');
const router = express.Router();
const { z } = require('zod');
const deviceAuth = require('../../../shared/middleware/deviceAuth');
const applySyncBatch = require('../service/applySyncBatch');

/**
 * POST /api/sync/push
 * Auth: Bearer <device token>
 *
 * Receives a batch of offline-created records from a personnel phone.
 * Idempotent per (device_id, batch_id): retries return cached response.
 *
 * Body: {
 *   device_id: uuid,
 *   batch_id: uuid,
 *   records: [
 *     { entity_table: string, entity_id: uuid, operation: 'insert'|'update', payload: {...} }
 *   ]
 * }
 *
 * Response: {
 *   batch_id,
 *   status: 'applied' | 'partial' | 'failed',
 *   accepted: [entity_id, ...],
 *   rejected: [{ entity_id, reason }, ...]
 * }
 */
const pushBodySchema = z.object({
  device_id: z.string().uuid(),
  batch_id: z.string().uuid(),
  records: z.array(z.object({
    entity_table: z.string(),
    entity_id: z.string().uuid(),
    operation: z.enum(['insert', 'update']),
    payload: z.record(z.any()),
  })).min(1),
});

router.post('/push', deviceAuth, async (req, res) => {
  try {
    // Validate body shape
    const parsed = pushBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.issues,
        },
      });
    }

    const { device_id, batch_id, records } = parsed.data;

    const result = await applySyncBatch({ device_id, batch_id, records });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[sync/push] error:', err.message);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Sync push failed' },
    });
  }
});

module.exports = router;
