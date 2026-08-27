const jwt = require('jsonwebtoken');

/**
 * Middleware: verifies the device bearer token from the Authorization header.
 * On success, attaches decoded token to req.device (with device_id, personnel_id).
 * Cross-checks that token's device_id matches the body's device_id if present.
 *
 * Auth scheme: Bearer <JWT signed with DEVICE_JWT_SECRET>
 * Token claims expected: { device_id: uuid, personnel_id: uuid, ... }
 */
module.exports = function deviceAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Missing or malformed Authorization header' },
    });
  }

  const token = authHeader.slice(7);
  const secret = process.env.DEVICE_JWT_SECRET;
  if (!secret) {
    console.error('[deviceAuth] DEVICE_JWT_SECRET not configured');
    return res.status(500).json({
      error: { code: 'SERVER_CONFIG_ERROR', message: 'Auth secret not configured' },
    });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.device = decoded;

    // Cross-check: if the body has a device_id, it must match the token
    if (req.body && req.body.device_id && req.body.device_id !== decoded.device_id) {
      return res.status(403).json({
        error: { code: 'DEVICE_MISMATCH', message: 'Body device_id does not match token' },
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: `Invalid token: ${err.message}` },
    });
  }
};
