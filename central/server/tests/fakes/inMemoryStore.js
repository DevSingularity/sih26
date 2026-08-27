// Implements the SyncStore contract documented in
// src/features/sync-ingestion/store/syncStore.interface.js purely in
// memory, so the LWW/idempotency logic in applyEvent.js and
// processBatch.js can be unit-tested without a real Postgres database.
let batchIdCounter = 0;

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function createInMemoryStore() {
  const mutableTables = new Map(); // table -> Map<id, row>
  const eventTables = new Map(); // table -> Set<id>
  const conflicts = [];
  const batches = [];

  function mutableTableMap(table) {
    if (!mutableTables.has(table)) mutableTables.set(table, new Map());
    return mutableTables.get(table);
  }

  function eventTableSet(table) {
    if (!eventTables.has(table)) eventTables.set(table, new Set());
    return eventTables.get(table);
  }

  const store = {
    async withTransaction(fn) {
      // No real isolation needed for tests (single-threaded, synchronous
      // Map access) — just run the callback against this same store.
      return fn(store);
    },

    async getMutableRow(table, id) {
      const row = mutableTableMap(table).get(id);
      return row ? clone(row) : null;
    },

    async insertMutableRow(table, row) {
      mutableTableMap(table).set(row.id, clone(row));
    },

    async updateMutableRow(table, id, patch) {
      const existing = mutableTableMap(table).get(id);
      mutableTableMap(table).set(id, { ...existing, ...clone(patch) });
    },

    async insertEventRow(table, row) {
      const set = eventTableSet(table);
      if (set.has(row.id)) return { inserted: false };
      set.add(row.id);
      return { inserted: true };
    },

    async recordConflict(conflict) {
      conflicts.push(clone(conflict));
    },

    async recordBatch(batch) {
      batchIdCounter += 1;
      const id = `batch-${batchIdCounter}`;
      batches.push({ id, ...clone(batch) });
      return { id };
    },

    // Test-only inspection helpers (not part of the SyncStore contract).
    _debug: { mutableTables, eventTables, conflicts, batches },
  };

  return store;
}

module.exports = { createInMemoryStore };
