const pool = require('../../shared/config/db');

async function listAlerts() {
  const result = await pool.query(
    'SELECT * FROM local_threshold_alerts ORDER BY raised_at DESC'
  );
  return result.rows;
}

module.exports = { listAlerts };
