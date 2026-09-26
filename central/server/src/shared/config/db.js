// PostgreSQL connection pool. See db/migrations/01_central_server_schema.sql for the schema.
const { Pool } = require('pg');
module.exports = new Pool({ connectionString: process.env.DATABASE_URL });
