const pool = require('../../shared/config/db');

async function listCargo() {
  const [shipments, items] = await Promise.all([
    pool.query('SELECT * FROM cargo_shipments ORDER BY client_updated_at DESC'),
    pool.query('SELECT * FROM cargo_items ORDER BY client_updated_at DESC'),
  ]);
  return { shipments: shipments.rows, items: items.rows };
}

module.exports = { listCargo };
