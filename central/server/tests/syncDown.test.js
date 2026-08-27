const test = require('node:test');
const assert = require('node:assert/strict');

const { getSyncDownPayload } = require('../src/features/stations/service/syncDown.service');
const { createFakePool } = require('./fakes/fakePool');

const MAITRI = { id: 'station-maitri', code: 'MAITRI' };
const BHARATI = { id: 'station-bharati', code: 'BHARATI' };

function fixturePool() {
  return createFakePool({
    stations: [MAITRI, BHARATI],
    personnel: [
      { id: 'p1', home_station_id: MAITRI.id, full_name: 'Old record', client_updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 'p2', home_station_id: MAITRI.id, full_name: 'Fresh record', client_updated_at: '2026-08-20T00:00:00.000Z' },
      { id: 'p3', home_station_id: BHARATI.id, full_name: 'Wrong station', client_updated_at: '2026-08-20T00:00:00.000Z' },
    ],
    expeditions: [
      { id: 'e1', station_id: MAITRI.id, name: 'Old expedition', updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 'e2', station_id: MAITRI.id, name: 'Fresh expedition', updated_at: '2026-08-20T00:00:00.000Z' },
      { id: 'e3', station_id: BHARATI.id, name: 'Wrong station expedition', updated_at: '2026-08-20T00:00:00.000Z' },
    ],
  });
}

test('sync-down: returns null for an unknown station code (caller 404s)', async () => {
  const pool = fixturePool();
  const result = await getSyncDownPayload(pool, { stationCode: 'NOTREAL', since: undefined });
  assert.equal(result, null);
});

test('sync-down: with no `since`, returns the full initial cache (everything for that station)', async () => {
  const pool = fixturePool();
  const result = await getSyncDownPayload(pool, { stationCode: 'maitri', since: undefined });

  assert.equal(result.personnel.length, 2);
  assert.equal(result.expeditions.length, 2);
  assert.ok(result.server_time);
});

test('sync-down: only returns rows updated strictly after `since`', async () => {
  const pool = fixturePool();
  const result = await getSyncDownPayload(pool, {
    stationCode: 'MAITRI',
    since: '2026-06-01T00:00:00.000Z',
  });

  assert.equal(result.personnel.length, 1);
  assert.equal(result.personnel[0].id, 'p2');
  assert.equal(result.expeditions.length, 1);
  assert.equal(result.expeditions[0].id, 'e2');
});

test('sync-down: is scoped to the requesting station — never leaks another station\'s rows', async () => {
  const pool = fixturePool();
  const result = await getSyncDownPayload(pool, { stationCode: 'MAITRI', since: undefined });

  assert.ok(result.personnel.every((p) => p.home_station_id === MAITRI.id));
  assert.ok(result.expeditions.every((e) => e.station_id === MAITRI.id));
});

test('sync-down: station code lookup is case-insensitive', async () => {
  const pool = fixturePool();
  const lower = await getSyncDownPayload(pool, { stationCode: 'bharati', since: undefined });
  assert.ok(lower);
  assert.equal(lower.personnel[0].id, 'p3');
});
