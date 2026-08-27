const { EVENT_TABLES } = require('../config/entityTables');
const { MUTABLE_TABLES } = require('../config/mutableTables');

const KNOWN_EVENT_TABLES = new Set(Object.keys(EVENT_TABLES));
const KNOWN_MUTABLE_TABLES = new Set(Object.keys(MUTABLE_TABLES));

function assertKnownTable(table, allowedSet) {
  if (!allowedSet.has(table)) {
    // Table names can't be parameterized in SQL, so every call site
    // that interpolates one into a query string re-validates against
    // this whitelist first — belt-and-braces alongside applyEvent.js
    // only ever dispatching known tables in the first place.
    throw new Error(`[pgStore] refusing to build SQL for unrecognized table "${table}"`);
  }
}

/**
 * Builds `col1, col2, ...` / `$1, $2, ...` for an INSERT, in a stable
 * order derived from Object.keys(row).
 */
function buildInsert(table, row) {
  const columns = Object.keys(row);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  const values = columns.map((c) => row[c]);
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
  return { sql, values };
}

function buildUpdate(table, id, patch) {
  const columns = Object.keys(patch);
  const setClauses = columns.map((c, i) => `${c} = $${i + 1}`);
  const values = columns.map((c) => patch[c]);
  values.push(id);
  const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = $${values.length}`;
  return { sql, values };
}

/**
 * Wraps a `pg` Pool or PoolClient with the SyncStore interface
 * documented in syncStore.interface.js.
 *
 * @param {import('pg').Pool} pool
 */
function createPgStore(pool) {
  function makeStore(queryable) {
    return {
      async withTransaction(fn) {
        // Already inside a transaction (this `queryable` is itself a
        // client handed to us by an outer withTransaction) — just run
        // the callback against the same client, no nested BEGIN.
        if (queryable.__isTxClient) {
          return fn(makeStore(queryable));
        }

        const client = await pool.connect();
        client.__isTxClient = true;
        try {
          await client.query('BEGIN');
          const result = await fn(makeStore(client));
          await client.query('COMMIT');
          return result;
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {});
          throw err;
        } finally {
          client.release();
        }
      },

      async getMutableRow(table, id) {
        assertKnownTable(table, KNOWN_MUTABLE_TABLES);
        const { rows } = await queryable.query(`SELECT * FROM ${table} WHERE id = $1 FOR UPDATE`, [id]);
        return rows[0] ?? null;
      },

      async insertMutableRow(table, row) {
        assertKnownTable(table, KNOWN_MUTABLE_TABLES);
        const { sql, values } = buildInsert(table, row);
        await queryable.query(sql, values);
      },

      async updateMutableRow(table, id, patch) {
        assertKnownTable(table, KNOWN_MUTABLE_TABLES);
        const { sql, values } = buildUpdate(table, id, patch);
        await queryable.query(sql, values);
      },

      async insertEventRow(table, row) {
        assertKnownTable(table, KNOWN_EVENT_TABLES);
        const columns = Object.keys(row);
        const placeholders = columns.map((_, i) => `$${i + 1}`);
        const values = columns.map((c) => row[c]);
        const sql =
          `INSERT INTO ${table} (${columns.join(', ')}, server_received_at) ` +
          `VALUES (${placeholders.join(', ')}, now()) ` +
          'ON CONFLICT (id) DO NOTHING RETURNING id';
        const { rows } = await queryable.query(sql, values);
        return { inserted: rows.length > 0 };
      },

      async recordConflict(conflict) {
        const sql =
          'INSERT INTO sync_conflicts (entity_table, entity_id, incoming_value, existing_value, resolution) ' +
          'VALUES ($1, $2, $3, $4, $5)';
        await queryable.query(sql, [
          conflict.entity_table,
          conflict.entity_id,
          JSON.stringify(conflict.incoming_value),
          JSON.stringify(conflict.existing_value),
          conflict.resolution,
        ]);
      },

      async recordBatch(batch) {
        const sql =
          'INSERT INTO sync_batches ' +
          '(source_station_id, kafka_topic, kafka_offset_start, kafka_offset_end, record_count, status) ' +
          'VALUES ($1, $2, $3, $4, $5, $6) RETURNING id';
        const { rows } = await queryable.query(sql, [
          batch.source_station_id,
          batch.kafka_topic,
          batch.kafka_offset_start,
          batch.kafka_offset_end,
          batch.record_count,
          batch.status,
        ]);
        return { id: rows[0].id };
      },
    };
  }

  return makeStore(pool);
}

module.exports = { createPgStore };
