// Service-to-service auth for endpoints station servers call directly
// (as opposed to admin_users, who authenticate via JWT — see
// auth.middleware.js). A single shared secret (STATION_SERVICE_API_KEY)
// is enough for the MVP: every station server presents the same key.
// If/when Bharati and other stations need to be told apart or revoked
// independently, swap this for a per-station key without changing the
// call sites that use this middleware.
//
// Accepted as either header:
//   X-Station-Api-Key: <key>
//   Authorization: Bearer <key>

function extractKey(req) {
  const headerKey = req.get('X-Station-Api-Key');
  if (headerKey) return headerKey;

  const authHeader = req.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }

  return null;
}

module.exports = function requireStationApiKey(req, res, next) {
  const expected = process.env.STATION_SERVICE_API_KEY;
  if (!expected) {
    // Misconfiguration, not a client error — fail loudly rather than
    // silently accepting every request because the env var is unset.
    // eslint-disable-next-line no-console
    console.error('[stations] STATION_SERVICE_API_KEY is not configured');
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const provided = extractKey(req);
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'invalid_or_missing_station_api_key' });
  }

  return next();
};
