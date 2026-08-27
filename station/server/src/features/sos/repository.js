const pool = require('../../shared/config/db');

async function listSOS(status) {
  let query = 'SELECT * FROM sos_incidents';
  const params = [];

  if (status) {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY (status <> \'resolved\') DESC, reported_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

async function getSOSById(id) {
  const result = await pool.query('SELECT * FROM sos_incidents WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function updateSOS(id, updates) {
  const allowedFields = ['status', 'acknowledged_at', 'resolved_at'];
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(updates[field]);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return null;

  values.push(id);
  const result = await pool.query(
    `UPDATE sos_incidents SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

module.exports = { listSOS, getSOSById, updateSOS };
