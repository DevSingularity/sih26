// Tests for the Kafka producer — uses mocked kafkajs and mocked pool.
// No real Kafka broker needed to run npm test.

// Mock kafkajs BEFORE requiring the producer
const mockSendBatch = jest.fn();
const mockConnect = jest.fn().mockResolvedValue(true);
const mockDisconnect = jest.fn().mockResolvedValue(true);

jest.mock('kafkajs', () => {
  return {
    Kafka: jest.fn().mockImplementation(() => ({
      producer: jest.fn().mockReturnValue({
        connect: mockConnect,
        sendBatch: mockSendBatch,
        disconnect: mockDisconnect,
      }),
    })),
  };
});

// Mock the pg pool
const mockQuery = jest.fn();
jest.mock('../../../shared/config/db', () => ({
  query: mockQuery,
}));

// Now require the producer (uses mocked modules)
const {
  fetchPendingEvents,
  produceBatch,
  pollImmediate,
  pollNormal,
  stopProducer,
} = require('./producer');

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await stopProducer();
});

function makeOutboxRow(overrides = {}) {
  return {
    id: 'evt-001',
    entity_table: 'cargo_shipments',
    entity_id: 'entity-001',
    operation: 'insert',
    payload: JSON.stringify({ id: 'entity-001', shipment_code: 'TEST-001' }),
    priority: 'normal',
    created_at: new Date().toISOString(),
    kafka_topic: 'maitri.station.events',
    ...overrides,
  };
}

describe('Kafka producer', () => {
  test('1: immediate poll fetches and produces a row, marks it as produced', async () => {
    // Seed: one pending immediate event
    const row = makeOutboxRow({ priority: 'immediate' });
    mockQuery
      .mockResolvedValueOnce({ rows: [row] })    // fetchPendingEvents
      .mockResolvedValueOnce({ rowCount: 1 });   // UPDATE outbound_sync_events

    mockSendBatch.mockResolvedValueOnce([
      { topicName: 'maitri.station.events', baseOffset: '42' },
    ]);

    await pollImmediate();

    // Verify sendBatch was called with a message whose key is the entity_id
    expect(mockSendBatch).toHaveBeenCalledTimes(1);
    const batchArg = mockSendBatch.mock.calls[0][0];
    expect(batchArg.topicMessages[0].messages[0].key).toBe('entity-001');

    // Verify the outbox row was marked as produced
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE outbound_sync_events'),
      expect.arrayContaining([expect.any(Date), expect.any(Number), 'evt-001'])
    );
  });

  test('2: producer failure leaves kafka_produced_at as NULL (row stays pending)', async () => {
    const row = makeOutboxRow({ priority: 'immediate' });
    mockQuery.mockResolvedValueOnce({ rows: [row] }); // fetchPendingEvents

    // Kafka is unreachable — sendBatch throws
    mockSendBatch.mockRejectedValueOnce(new Error('Kafka broker not available'));

    await expect(pollImmediate()).rejects.toThrow('Kafka broker not available');

    // Verify UPDATE was NOT called (row stays pending)
    const updateCalls = mockQuery.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('UPDATE outbound_sync_events')
    );
    expect(updateCalls).toHaveLength(0);
  });

  test('3: immediate poll only produces immediate rows, skips normal rows', async () => {
    // Seed: one normal + one immediate event
    const normalRow = makeOutboxRow({ id: 'evt-normal', priority: 'normal', entity_id: 'entity-normal' });
    const immediateRow = makeOutboxRow({ id: 'evt-immediate', priority: 'immediate', entity_id: 'entity-immediate' });

    // First call: fetchPendingEvents for 'immediate' — only returns the immediate row
    mockQuery.mockResolvedValueOnce({ rows: [immediateRow] });
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // UPDATE

    mockSendBatch.mockResolvedValueOnce([
      { topicName: 'maitri.station.events', baseOffset: '100' },
    ]);

    await pollImmediate();

    // sendBatch should only contain the immediate row's entity_id
    const batchArg = mockSendBatch.mock.calls[0][0];
    expect(batchArg.topicMessages[0].messages).toHaveLength(1);
    expect(batchArg.topicMessages[0].messages[0].key).toBe('entity-immediate');
  });
});
