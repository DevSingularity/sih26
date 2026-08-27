const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../../shared/middleware/auth.middleware');

async function authenticate(pool, { username, password }) {
  const { rows } = await pool.query(
    'SELECT id, username, password_hash, role FROM admin_users WHERE username = $1',
    [username]
  );

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return null;
  }

  await pool.query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [user.id]);

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  return { token, user: { id: user.id, username: user.username, role: user.role } };
}

module.exports = { authenticate };
