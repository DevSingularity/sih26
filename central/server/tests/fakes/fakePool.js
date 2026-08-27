// A minimal stand-in for a `pg` Pool: matches which table a query
// targets by substring on the SQL text (we control both the SQL and
// this fake, so this is a reasonable, low-effort way to unit-test
// query-building code without spinning up Postgres).
function createFakePool({ stations = [], personnel = [], expeditions = [] } = {}) {
  const calls = [];

  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });

      if (sql.includes('FROM stations')) {
        const [code] = params;
        return { rows: stations.filter((s) => s.code === code) };
      }

      if (sql.includes('FROM personnel')) {
        const [stationId, since] = params;
        return {
          rows: personnel.filter(
            (p) => p.home_station_id === stationId && new Date(p.client_updated_at) > new Date(since),
          ),
        };
      }

      if (sql.includes('FROM expeditions')) {
        const [stationId, since] = params;
        return {
          rows: expeditions.filter(
            (e) => e.station_id === stationId && new Date(e.updated_at) > new Date(since),
          ),
        };
      }

      throw new Error(`fakePool: unrecognized query: ${sql}`);
    },
  };
}

module.exports = { createFakePool };
