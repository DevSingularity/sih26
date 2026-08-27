const axios = require('axios');
const pool = require('../../../shared/config/db');

/**
 * Pull personnel_cache and expedition_cache from the central server.
 * Tracks pull runs in sync_down_runs for "last successful pull" tracking.
 *
 * Flow:
 * 1. Look up last successful pull timestamp
 * 2. GET ${CENTRAL_SERVER_BASE_URL}/api/stations/${STATION_CODE}/sync-down?since=<ts>
 * 3. Upsert results into personnel_cache and expedition_cache
 * 4. Record the run in sync_down_runs
 */
async function syncDown() {
  const centralUrl = process.env.CENTRAL_SERVER_BASE_URL;
  const apiKey = process.env.CENTRAL_SERVER_API_KEY;
  const stationCode = process.env.STATION_CODE || 'MAITRI';

  if (!centralUrl) {
    throw new Error('CENTRAL_SERVER_BASE_URL not configured');
  }

  // 1. Find last successful pull timestamp
  const lastRun = await pool.query(
    `SELECT completed_at FROM sync_down_runs
     WHERE status = 'success'
     ORDER BY completed_at DESC LIMIT 1`
  );
  const since = lastRun.rows.length > 0 ? lastRun.rows[0].completed_at : null;

  // 2. Record this pull attempt
  const runResult = await pool.query(
    `INSERT INTO sync_down_runs (since_param, status)
     VALUES ($1, 'success')
     RETURNING id`,
    [since]
  );
  const runId = runResult.rows[0].id;

  try {
    // 3. Call central server
    const url = `${centralUrl}/api/stations/${stationCode}/sync-down`;
    const params = {};
    if (since) params.since = since.toISOString();

    const headers = {};
    if (apiKey) headers['X-Api-Key'] = apiKey;

    const response = await axios.get(url, { params, headers, timeout: 30000 });
    const { personnel = [], expeditions = [] } = response.data;

    // 4. Upsert into local cache tables in a single transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const p of personnel) {
        await client.query(
          `INSERT INTO personnel_cache (id, employee_code, full_name, role, designation, phone, status, last_synced_from_hq)
           VALUES ($1, $2, $3, $4, $5, $6, $7, now())
           ON CONFLICT (id) DO UPDATE SET
             employee_code = EXCLUDED.employee_code,
             full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             designation = EXCLUDED.designation,
             phone = EXCLUDED.phone,
             status = EXCLUDED.status,
             last_synced_from_hq = now()`,
          [p.id, p.employee_code, p.full_name, p.role, p.designation || null, p.phone || null, p.status || 'active']
        );
      }

      for (const e of expeditions) {
        await client.query(
          `INSERT INTO expedition_cache (id, name, start_date, end_date, status, resource_plan, last_synced_from_hq)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             start_date = EXCLUDED.start_date,
             end_date = EXCLUDED.end_date,
             status = EXCLUDED.status,
             resource_plan = EXCLUDED.resource_plan,
             last_synced_from_hq = now()`,
          [e.id, e.name, e.start_date || null, e.end_date || null, e.status || null,
           e.resource_plan ? JSON.stringify(e.resource_plan) : null]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // 5. Update run record with success
    const totalRecords = personnel.length + expeditions.length;
    await pool.query(
      `UPDATE sync_down_runs SET completed_at = now(), status = 'success', records_pulled = $1 WHERE id = $2`,
      [totalRecords, runId]
    );

    return { status: 'success', records_pulled: totalRecords, since };
  } catch (err) {
    // 6. Update run record with failure — do NOT throw uncaught
    await pool.query(
      `UPDATE sync_down_runs SET completed_at = now(), status = 'failed', error_message = $1 WHERE id = $2`,
      [err.message, runId]
    );

    console.error('[sync-down] pull failed:', err.message);
    return { status: 'failed', error: err.message, since };
  }
}

module.exports = syncDown;
