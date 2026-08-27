const { EVENT_TABLES } = require('../config/entityTables');
const { MUTABLE_TABLES } = require('../config/mutableTables');

/**
 * Picks only whitelisted columns out of an incoming payload. Anything
 * in the payload that isn't on the table's whitelist is silently
 * dropped rather than written — this is what stops an unexpected or
 * malformed field from a station payload turning into a SQL identifier
 * or an unintended column write.
 */
function pickColumns(payload, columns) {
  const row = {};
  for (const col of columns) {
    if (Object.prototype.hasOwnProperty.call(payload, col)) {
      row[col] = payload[col];
    }
  }
  return row;
}

function toTimestamp(value) {
  if (value === null || value === undefined) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * insert/update on an append-only event table -> plain insert keyed on
 * the client-generated id. ON CONFLICT (id) DO NOTHING makes retried
 * outbox sends idempotent. `delete` is not a concept these tables
 * support (they're events, not state), so it's logged and skipped.
 */
async function applyEventTableWrite(store, table, entityId, operation, payload) {
  if (operation === 'delete') {
    return {
      status: 'skipped_unsupported_delete',
      table,
      id: entityId,
      reason: `${table} is append-only; delete operations are not applicable`,
    };
  }

  const { columns } = EVENT_TABLES[table];
  const row = { id: entityId, ...pickColumns(payload, columns) };

  const { inserted } = await store.insertEventRow(table, row);
  return { status: inserted ? 'inserted' : 'ignored_duplicate', table, id: entityId };
}

/**
 * insert/update on a mutable entity -> Last-Write-Wins on
 * client_updated_at.
 *   - No existing row: this write establishes the row. Not a conflict.
 *   - Existing row + incoming strictly newer: incoming wins, row is
 *     updated, sync_version bumped.
 *   - Existing row + incoming NOT strictly newer (older or a tie):
 *     incoming is discarded and logged to sync_conflicts so the losing
 *     write is never silently dropped.
 */
async function applyMutableWrite(store, table, entityId, operation, payload) {
  if (payload.client_updated_at === undefined || payload.client_updated_at === null) {
    return {
      status: 'skipped_missing_client_updated_at',
      table,
      id: entityId,
      reason: 'mutable-entity payloads must carry client_updated_at for LWW comparison',
    };
  }

  const { columns } = MUTABLE_TABLES[table];
  const incomingUpdatedAtMs = toTimestamp(payload.client_updated_at);

  return store.withTransaction(async (tx) => {
    const existing = await tx.getMutableRow(table, entityId);

    if (!existing) {
      const row = {
        id: entityId,
        ...pickColumns(payload, columns),
        client_updated_at: payload.client_updated_at,
        server_received_at: new Date().toISOString(),
        sync_version: 1,
        is_deleted: operation === 'delete' ? true : Boolean(payload.is_deleted),
      };
      await tx.insertMutableRow(table, row);
      return { status: 'inserted', table, id: entityId };
    }

    const existingUpdatedAtMs = toTimestamp(existing.client_updated_at);
    const incomingIsStrictlyNewer =
      incomingUpdatedAtMs !== null &&
      existingUpdatedAtMs !== null &&
      incomingUpdatedAtMs > existingUpdatedAtMs;

    if (incomingIsStrictlyNewer) {
      // Defense-in-depth clock-skew guard: sync_version is NOT used to
      // resolve the conflict (client_updated_at is authoritative per
      // the schema's documented policy), but a newer timestamp paired
      // with a sync_version that hasn't advanced is a signal a
      // station/device clock may be wrong. Log it; still honor LWW.
      const existingSyncVersion = Number(existing.sync_version) || 0;
      if (payload.sync_version !== undefined && payload.sync_version !== null) {
        const incomingSyncVersion = Number(payload.sync_version);
        if (!Number.isNaN(incomingSyncVersion) && incomingSyncVersion <= existingSyncVersion) {
          // eslint-disable-next-line no-console
          console.warn(
            `[sync-ingestion] clock-skew guard: ${table}/${entityId} — incoming client_updated_at ` +
              `is newer but incoming sync_version (${incomingSyncVersion}) did not advance past the ` +
              `stored sync_version (${existingSyncVersion}). Applying LWW result anyway per policy.`,
          );
        }
      }

      const patch = {
        ...pickColumns(payload, columns),
        client_updated_at: payload.client_updated_at,
        server_received_at: new Date().toISOString(),
        sync_version: existingSyncVersion + 1,
        is_deleted: operation === 'delete' ? true : (payload.is_deleted ?? existing.is_deleted),
      };
      await tx.updateMutableRow(table, entityId, patch);
      return { status: 'updated', table, id: entityId };
    }

    // Incoming loses: not strictly newer than what's stored (older, or
    // a tie). Never dropped silently — audit it.
    await tx.recordConflict({
      entity_table: table,
      entity_id: entityId,
      incoming_value: payload,
      existing_value: existing,
      resolution: 'existing_wins',
    });
    return { status: 'conflict_discarded', table, id: entityId };
  });
}

/**
 * Applies one ingestion event (shape mirrors a row from the station
 * server's outbound_sync_events table:
 *   { entity_table, entity_id, operation, payload, priority, ... }
 * ) against `store`.
 *
 * Returns a small result object describing what happened, used for
 * logging/metrics and for building the sync_batches summary.
 */
async function applyEvent(store, event) {
  const { entity_table: table, entity_id: entityId, operation, payload } = event;

  if (!table || !entityId || !operation || !payload) {
    return {
      status: 'skipped_malformed_event',
      table: table || null,
      id: entityId || null,
      reason: 'event is missing entity_table, entity_id, operation, or payload',
    };
  }

  if (EVENT_TABLES[table]) {
    return applyEventTableWrite(store, table, entityId, operation, payload);
  }

  if (MUTABLE_TABLES[table]) {
    return applyMutableWrite(store, table, entityId, operation, payload);
  }

  return {
    status: 'skipped_unknown_table',
    table,
    id: entityId,
    reason: `${table} is not a recognized syncable table on the central schema`,
  };
}

module.exports = { applyEvent, pickColumns };
