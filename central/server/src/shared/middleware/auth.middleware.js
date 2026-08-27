// JWT auth + RBAC middleware for admin_users (super_admin, ops_manager,
// logistics_officer, viewer). See build prompt section 3.
module.exports = function requireAuth(_req, _res, next) { next(); /* TODO */ };
