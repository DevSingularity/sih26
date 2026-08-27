const test = require('node:test');
const assert = require('node:assert/strict');

const { applyEvent } = require('../src/features/sync-ingestion/ingestion/applyEvent');
const { createInMemoryStore } = require('./fakes/inMemoryStore');

function cargoItemEvent({ id, clientUpdatedAt, quantity, syncVersion, operation = 'update' }) {
  return {
    entity_table: 'cargo_items',
    entity_id: id,
    operation,
    priority: 'normal',
    payload: {
      id,
      shipment_id: 'shipment-1',
      station_id: 'station-maitri',
      item_name: 'Diesel drum',
      quantity,
      unit: 'drum',
      status: 'scanned',
      origin_station_id: 'station-maitri',
      origin_device_id: 'device-1',
      client_updated_at: clientUpdatedAt,
      sync_version: syncVersion,
      is_deleted: false,
    },
  };
}

// -----------------------------------------------------------------
// The test required by the build prompt: two conflicting updates for
// the same cargo_items.id with different client_updated_at — the
// older one must land in sync_conflicts, never in the live row.
//
// Delivery order matters here: this simulates the realistic case of a
// delayed/retried message arriving *after* a later update already won
// (e.g. a satellite-link retry). If the newer message is applied
// first, then the older one arrives, LWW must discard the older one
// and log it — it must never clobber the already-newer live row.
// -----------------------------------------------------------------
test('LWW: an older update arriving after a newer one is discarded and logged to sync_conflicts, never applied to the live row', async () => {
  const store = createInMemoryStore();
  const itemId = 'cargo-item-1';

  const baseline = cargoItemEvent({
    id: itemId,
    clientUpdatedAt: '2026-08-20T08:00:00.000Z',
    quantity: 10,
    syncVersion: 1,
    operation: 'insert',
  });
  const newer = cargoItemEvent({
    id: itemId,
    clientUpdatedAt: '2026-08-20T09:00:00.000Z', // T2, newer
    quantity: 25,
    syncVersion: 2,
  });
  const older = cargoItemEvent({
    id: itemId,
    clientUpdatedAt: '2026-08-20T08:30:00.000Z', // T1, older than T2 but newer than baseline
    quantity: 999, // if this ever won, it would be very obviously wrong on the live row
    syncVersion: 2,
  });

  const baselineResult = await applyEvent(store, baseline);
  assert.equal(baselineResult.status, 'inserted');

  const newerResult = await applyEvent(store, newer);
  assert.equal(newerResult.status, 'updated');

  const olderResult = await applyEvent(store, older);
  assert.equal(olderResult.status, 'conflict_discarded');

  const liveRow = await store.getMutableRow('cargo_items', itemId);
  assert.equal(liveRow.quantity, 25, 'live row must reflect the newer write, not the older one');
  assert.equal(liveRow.client_updated_at, newer.payload.client_updated_at);

  assert.equal(store._debug.conflicts.length, 1);
  const [conflict] = store._debug.conflicts;
  assert.equal(conflict.entity_table, 'cargo_items');
  assert.equal(conflict.entity_id, itemId);
  assert.equal(conflict.resolution, 'existing_wins');
  assert.equal(conflict.incoming_value.quantity, 999, 'the discarded (older) payload is preserved for audit');
  assert.equal(conflict.existing_value.quantity, 25, 'existing_value captured is the row that won');
});

test('LWW: applying updates in chronological order never produces a spurious conflict', async () => {
  const store = createInMemoryStore();
  const itemId = 'cargo-item-2';

  await applyEvent(
    store,
    cargoItemEvent({ id: itemId, clientUpdatedAt: '2026-08-20T08:00:00.000Z', quantity: 5, syncVersion: 1, operation: 'insert' }),
  );
  await applyEvent(
    store,
    cargoItemEvent({ id: itemId, clientUpdatedAt: '2026-08-20T08:30:00.000Z', quantity: 8, syncVersion: 2 }),
  );
  const finalResult = await applyEvent(
    store,
    cargoItemEvent({ id: itemId, clientUpdatedAt: '2026-08-20T09:00:00.000Z', quantity: 12, syncVersion: 3 }),
  );

  assert.equal(finalResult.status, 'updated');
  const liveRow = await store.getMutableRow('cargo_items', itemId);
  assert.equal(liveRow.quantity, 12);
  assert.equal(liveRow.sync_version, 3);
  assert.equal(store._debug.conflicts.length, 0);
});

test('LWW: a tie on client_updated_at is not "strictly newer" — existing wins and incoming is logged', async () => {
  const store = createInMemoryStore();
  const itemId = 'cargo-item-3';
  const ts = '2026-08-20T08:00:00.000Z';

  await applyEvent(store, cargoItemEvent({ id: itemId, clientUpdatedAt: ts, quantity: 1, syncVersion: 1, operation: 'insert' }));
  const tieResult = await applyEvent(store, cargoItemEvent({ id: itemId, clientUpdatedAt: ts, quantity: 2, syncVersion: 2 }));

  assert.equal(tieResult.status, 'conflict_discarded');
  const liveRow = await store.getMutableRow('cargo_items', itemId);
  assert.equal(liveRow.quantity, 1);
  assert.equal(store._debug.conflicts.length, 1);
});

test('mutable entity: sync_version starts at 1 on first insert and increments by 1 per accepted write', async () => {
  const store = createInMemoryStore();
  const id = 'personnel-1';
  const insertEvent = {
    entity_table: 'personnel',
    entity_id: id,
    operation: 'insert',
    priority: 'normal',
    payload: {
      id,
      employee_code: 'NCPOR-001',
      full_name: 'A. Sharma',
      role: 'field_personnel',
      origin_station_id: 'station-maitri',
      client_updated_at: '2026-08-20T08:00:00.000Z',
    },
  };
  const insertResult = await applyEvent(store, insertEvent);
  assert.equal(insertResult.status, 'inserted');
  let row = await store.getMutableRow('personnel', id);
  assert.equal(row.sync_version, 1);

  const updateEvent = {
    ...insertEvent,
    operation: 'update',
    payload: { ...insertEvent.payload, full_name: 'A. Sharma Jr.', client_updated_at: '2026-08-20T09:00:00.000Z' },
  };
  const updateResult = await applyEvent(store, updateEvent);
  assert.equal(updateResult.status, 'updated');
  row = await store.getMutableRow('personnel', id);
  assert.equal(row.sync_version, 2);
  assert.equal(row.full_name, 'A. Sharma Jr.');
});

test('event table: insert is idempotent via ON CONFLICT (id) DO NOTHING semantics', async () => {
  const store = createInMemoryStore();
  const event = {
    entity_table: 'field_updates',
    entity_id: 'update-1',
    operation: 'insert',
    priority: 'normal',
    payload: {
      id: 'update-1',
      personnel_id: 'personnel-1',
      station_id: 'station-maitri',
      update_type: 'note',
      content: 'Generator refueled.',
      occurred_at: '2026-08-20T08:00:00.000Z',
      origin_device_id: 'device-1',
    },
  };

  const first = await applyEvent(store, event);
  assert.equal(first.status, 'inserted');

  // Simulates a retried outbox send from a flaky satellite link.
  const retry = await applyEvent(store, event);
  assert.equal(retry.status, 'ignored_duplicate');

  assert.equal(store._debug.eventTables.get('field_updates').size, 1);
});

test('event table: never conflict-resolved — a second "update" op with different content is still a plain idempotent insert attempt', async () => {
  const store = createInMemoryStore();
  const base = {
    entity_table: 'sos_incidents',
    entity_id: 'sos-1',
    operation: 'insert',
    priority: 'immediate',
    payload: {
      id: 'sos-1',
      personnel_id: 'personnel-1',
      station_id: 'station-maitri',
      incident_type: 'medical',
      severity: 'critical',
      status: 'reported',
      reported_at: '2026-08-20T08:00:00.000Z',
      origin_device_id: 'device-1',
    },
  };
  await applyEvent(store, base);
  const result = await applyEvent(store, {
    ...base,
    operation: 'update',
    payload: { ...base.payload, description: 'late-arriving duplicate, should no-op' },
  });
  assert.equal(result.status, 'ignored_duplicate');
});

test('event table: delete operation is unsupported (append-only) and is skipped, not applied', async () => {
  const store = createInMemoryStore();
  const result = await applyEvent(store, {
    entity_table: 'location_tracks',
    entity_id: 'track-1',
    operation: 'delete',
    priority: 'normal',
    payload: { id: 'track-1', personnel_id: 'p1', station_id: 's1', points: [], point_count: 0 },
  });
  assert.equal(result.status, 'skipped_unsupported_delete');
  assert.equal(store._debug.eventTables.get('location_tracks')?.size ?? 0, 0);
});

test('mutable entity: delete operation sets the is_deleted tombstone instead of removing the row', async () => {
  const store = createInMemoryStore();
  const id = 'cargo-item-4';
  await applyEvent(store, cargoItemEvent({ id, clientUpdatedAt: '2026-08-20T08:00:00.000Z', quantity: 3, syncVersion: 1, operation: 'insert' }));

  const deleteResult = await applyEvent(store, {
    entity_table: 'cargo_items',
    entity_id: id,
    operation: 'delete',
    priority: 'normal',
    payload: {
      id,
      shipment_id: 'shipment-1',
      station_id: 'station-maitri',
      item_name: 'Diesel drum',
      quantity: 3,
      client_updated_at: '2026-08-20T09:00:00.000Z',
    },
  });

  assert.equal(deleteResult.status, 'updated');
  const row = await store.getMutableRow('cargo_items', id);
  assert.equal(row.is_deleted, true, 'row is soft-deleted, never hard-deleted');
});

test('unknown table names are rejected rather than silently written', async () => {
  const result = await applyEvent(createInMemoryStore(), {
    entity_table: 'not_a_real_table',
    entity_id: 'x',
    operation: 'insert',
    priority: 'normal',
    payload: { id: 'x' },
  });
  assert.equal(result.status, 'skipped_unknown_table');
});

test('malformed events (missing required fields) are rejected rather than throwing', async () => {
  const result = await applyEvent(createInMemoryStore(), { entity_table: 'cargo_items' });
  assert.equal(result.status, 'skipped_malformed_event');
});

test('mutable entity payload without client_updated_at cannot be LWW-resolved and is skipped', async () => {
  const result = await applyEvent(createInMemoryStore(), {
    entity_table: 'cargo_items',
    entity_id: 'cargo-item-5',
    operation: 'insert',
    priority: 'normal',
    payload: { id: 'cargo-item-5', item_name: 'Tent' },
  });
  assert.equal(result.status, 'skipped_missing_client_updated_at');
});

test('only whitelisted columns are ever written, even if the payload contains extra keys', async () => {
  const store = createInMemoryStore();
  const id = 'cargo-item-6';
  await applyEvent(store, {
    entity_table: 'cargo_items',
    entity_id: id,
    operation: 'insert',
    priority: 'normal',
    payload: {
      id,
      item_name: 'Snowmobile part',
      client_updated_at: '2026-08-20T08:00:00.000Z',
      sql_injection_attempt: "'; DROP TABLE cargo_items; --",
      some_unexpected_field: 'should never reach the row',
    },
  });
  const row = await store.getMutableRow('cargo_items', id);
  assert.equal(row.sql_injection_attempt, undefined);
  assert.equal(row.some_unexpected_field, undefined);
  assert.equal(row.item_name, 'Snowmobile part');
});
