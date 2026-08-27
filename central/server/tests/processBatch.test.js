const test = require('node:test');
const assert = require('node:assert/strict');

const { processBatch } = require('../src/features/sync-ingestion/ingestion/processBatch');
const { createInMemoryStore } = require('./fakes/inMemoryStore');

function fieldUpdateEvent(id) {
  return {
    entity_table: 'field_updates',
    entity_id: id,
    operation: 'insert',
    priority: 'normal',
    payload: {
      id,
      personnel_id: 'personnel-1',
      station_id: 'station-maitri',
      update_type: 'daily_activity',
      content: `entry ${id}`,
      occurred_at: '2026-08-20T08:00:00.000Z',
      origin_device_id: 'device-1',
    },
  };
}

test('processBatch: all events succeed -> status "processed" and one sync_batches row recorded', async () => {
  const store = createInMemoryStore();
  const events = [fieldUpdateEvent('u1'), fieldUpdateEvent('u2'), fieldUpdateEvent('u3')];

  const outcome = await processBatch(store, {
    sourceStationId: 'station-maitri',
    kafkaTopic: 'maitri.station.events',
    kafkaOffsetStart: 100,
    kafkaOffsetEnd: 102,
    events,
  });

  assert.equal(outcome.status, 'processed');
  assert.equal(outcome.errorCount, 0);
  assert.equal(store._debug.batches.length, 1);
  assert.deepEqual(store._debug.batches[0], {
    id: outcome.batchId,
    source_station_id: 'station-maitri',
    kafka_topic: 'maitri.station.events',
    kafka_offset_start: 100,
    kafka_offset_end: 102,
    record_count: 3,
    status: 'processed',
  });
});

test('processBatch: one bad event does not block the rest of the batch, and status is "partial"', async () => {
  const store = createInMemoryStore();
  const originalInsert = store.insertEventRow.bind(store);
  store.insertEventRow = async (table, row) => {
    if (row.id === 'u-bad') throw new Error('simulated DB failure');
    return originalInsert(table, row);
  };

  const events = [fieldUpdateEvent('u1'), fieldUpdateEvent('u-bad'), fieldUpdateEvent('u3')];
  const outcome = await processBatch(store, {
    sourceStationId: 'station-maitri',
    kafkaTopic: 'maitri.station.events',
    events,
  });

  assert.equal(outcome.status, 'partial');
  assert.equal(outcome.errorCount, 1);
  assert.equal(outcome.results.filter((r) => r.status === 'inserted').length, 2);
  assert.equal(outcome.results.find((r) => r.id === 'u-bad').status, 'error');
  assert.equal(store._debug.batches[0].status, 'partial');
});

test('processBatch: every event fails -> status "failed"', async () => {
  const store = createInMemoryStore();
  store.insertEventRow = async () => {
    throw new Error('DB is down');
  };

  const outcome = await processBatch(store, {
    sourceStationId: 'station-maitri',
    kafkaTopic: 'maitri.station.events',
    events: [fieldUpdateEvent('u1'), fieldUpdateEvent('u2')],
  });

  assert.equal(outcome.status, 'failed');
  assert.equal(outcome.errorCount, 2);
});

test('processBatch: immediate-priority SOS event is processed as its own single-event batch', async () => {
  const store = createInMemoryStore();
  const sosEvent = {
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

  const outcome = await processBatch(store, {
    sourceStationId: 'station-maitri',
    kafkaTopic: 'maitri.station.events',
    kafkaOffsetStart: 500,
    kafkaOffsetEnd: 500,
    events: [sosEvent],
  });

  assert.equal(outcome.status, 'processed');
  assert.equal(store._debug.batches[0].record_count, 1);
  assert.equal(store._debug.eventTables.get('sos_incidents').has('sos-1'), true);
});
