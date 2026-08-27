// PostgreSQL connection pool. See db/migrations/02_maitri_station_schema.sql.
const { Pool } = require('pg');
module.exports = new Pool({ connectionString: process.env.DATABASE_URL });
