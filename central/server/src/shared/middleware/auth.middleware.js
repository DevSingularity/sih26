// JWT auth + RBAC middleware for admin_users (super_admin, ops_manager,
// logistics_officer, viewer). See build prompt section 3.
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const ROLE_HIERARCHY = {
  super_admin: 4,
  ops_manager: 3,
  logistics_officer: 2,
  viewer: 1,
};

function requireAuth(req, res, next) {
  const authHeader = req.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_or_invalid_token' });
  }

  const token = authHeader.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminUser = decoded; // { id, username, role, iat, exp }
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_or_expired_token' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.adminUser) {
      return res.status(401).json({ error: 'not_authenticated' });
    }
    if (!allowedRoles.includes(req.adminUser.role)) {
      return res.status(403).json({ error: 'insufficient_permissions', required: allowedRoles });
    }
    return next();
  };
}

function requireMinRole(minimumRole) {
  return (req, res, next) => {
    if (!req.adminUser) {
      return res.status(401).json({ error: 'not_authenticated' });
    }
    const userLevel = ROLE_HIERARCHY[req.adminUser.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;
    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: 'insufficient_permissions', minimum_role: minimumRole });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole, requireMinRole, JWT_SECRET, ROLE_HIERARCHY };
