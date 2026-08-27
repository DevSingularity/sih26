// Topic naming convention (see docs/01_central_server_build_prompt.md
// and schemas/README.md): "<station_code_lowercase>.station.events",
// e.g. "maitri.station.events" -> station code "MAITRI". This lets a
// new station (Bharati, etc.) show up just by producing to its own
// topic and getting a `stations` row with a matching code — no code
// change here.
function stationCodeFromTopic(topic) {
  const [prefix] = topic.split('.');
  return prefix ? prefix.toUpperCase() : null;
}

/**
 * @param {import('pg').Pool} pool
 */
function createStationResolver(pool) {
  const cache = new Map(); // code -> station id

  async function resolveStationIdForTopic(topic, payload) {
    // Prefer an explicit origin_station_id on the payload itself when
    // present (mutable-entity payloads carry it); fall back to the
    // topic-name convention for event-table payloads that key off
    // station_id instead, or when origin_station_id is absent.
    if (payload && payload.origin_station_id) {
      return payload.origin_station_id;
    }

    const code = stationCodeFromTopic(topic);
    if (!code) return null;

    if (cache.has(code)) return cache.get(code);

    const { rows } = await pool.query('SELECT id FROM stations WHERE code = $1', [code]);
    const id = rows[0]?.id ?? null;
    if (id) cache.set(code, id);
    return id;
  }

  return { resolveStationIdForTopic, stationCodeFromTopic };
}

module.exports = { createStationResolver, stationCodeFromTopic };
