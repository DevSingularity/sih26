// Station servers cache `personnel` and `expeditions` locally so field
// ops keep working offline (see schemas/README.md's "what lives
// where" table — both are read-only caches at the station tier,
// authored/owned here centrally). This is a pull, not a push: each
// station server calls this on its own schedule with the last `since`
// it successfully synced.
//
// Scope: a station only needs to cache *its own* personnel
// (personnel.home_station_id) and *its own* expeditions
// (expeditions.station_id) — not the full cross-station dataset, which
// only the central server needs.

const EPOCH = new Date(0).toISOString();

async function resolveStationByCode(pool, stationCode) {
  const { rows } = await pool.query('SELECT id, code FROM stations WHERE code = $1', [
    stationCode.toUpperCase(),
  ]);
  return rows[0] ?? null;
}

async function fetchPersonnelSince(pool, stationId, since) {
  const { rows } = await pool.query(
    'SELECT * FROM personnel WHERE home_station_id = $1 AND client_updated_at > $2 ORDER BY client_updated_at ASC',
    [stationId, since],
  );
  return rows;
}

async function fetchExpeditionsSince(pool, stationId, since) {
  const { rows } = await pool.query(
    'SELECT * FROM expeditions WHERE station_id = $1 AND updated_at > $2 ORDER BY updated_at ASC',
    [stationId, since],
  );
  return rows;
}

/**
 * @param {import('pg').Pool} pool
 * @param {object} opts
 * @param {string} opts.stationCode
 * @param {string} [opts.since] ISO timestamp; defaults to the epoch (full initial sync)
 * @returns {Promise<{ station: object, personnel: object[], expeditions: object[], server_time: string } | null>}
 *   null means the station code doesn't exist (caller should 404).
 */
async function getSyncDownPayload(pool, { stationCode, since }) {
  const station = await resolveStationByCode(pool, stationCode);
  if (!station) return null;

  const sinceTimestamp = since || EPOCH;

  const [personnel, expeditions] = await Promise.all([
    fetchPersonnelSince(pool, station.id, sinceTimestamp),
    fetchExpeditionsSince(pool, station.id, sinceTimestamp),
  ]);

  return {
    station,
    personnel,
    expeditions,
    server_time: new Date().toISOString(),
  };
}

module.exports = { getSyncDownPayload, EPOCH };
