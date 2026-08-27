const test = require('node:test');
const assert = require('node:assert/strict');

const requireStationApiKey = require('../src/shared/middleware/serviceAuth.middleware');

function fakeReqRes(headers = {}) {
  const req = {
    get(name) {
      const key = Object.keys(headers).find((h) => h.toLowerCase() === name.toLowerCase());
      return key ? headers[key] : undefined;
    },
  };
  let statusCode = null;
  let jsonBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      jsonBody = body;
      return this;
    },
  };
  return { req, res, getStatus: () => statusCode, getJson: () => jsonBody };
}

test('serviceAuth: rejects when STATION_SERVICE_API_KEY is not configured', async () => {
  const original = process.env.STATION_SERVICE_API_KEY;
  delete process.env.STATION_SERVICE_API_KEY;
  try {
    const { req, res, getStatus, getJson } = fakeReqRes({ 'X-Station-Api-Key': 'anything' });
    let nextCalled = false;
    requireStationApiKey(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(getStatus(), 500);
    assert.equal(getJson().error, 'server_misconfigured');
  } finally {
    if (original !== undefined) process.env.STATION_SERVICE_API_KEY = original;
  }
});

test('serviceAuth: rejects a missing key', () => {
  process.env.STATION_SERVICE_API_KEY = 'secret-key';
  const { req, res, getStatus } = fakeReqRes({});
  let nextCalled = false;
  requireStationApiKey(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(getStatus(), 401);
});

test('serviceAuth: rejects a wrong key', () => {
  process.env.STATION_SERVICE_API_KEY = 'secret-key';
  const { req, res, getStatus } = fakeReqRes({ 'X-Station-Api-Key': 'wrong' });
  let nextCalled = false;
  requireStationApiKey(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(getStatus(), 401);
});

test('serviceAuth: accepts the correct key via X-Station-Api-Key header', () => {
  process.env.STATION_SERVICE_API_KEY = 'secret-key';
  const { req, res } = fakeReqRes({ 'X-Station-Api-Key': 'secret-key' });
  let nextCalled = false;
  requireStationApiKey(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});

test('serviceAuth: accepts the correct key via Authorization: Bearer header', () => {
  process.env.STATION_SERVICE_API_KEY = 'secret-key';
  const { req, res } = fakeReqRes({ Authorization: 'Bearer secret-key' });
  let nextCalled = false;
  requireStationApiKey(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});
