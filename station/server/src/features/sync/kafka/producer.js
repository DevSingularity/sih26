const { Kafka } = require('kafkajs');
const pool = require('../../../shared/config/db');

let producer = null;
let kafka = null;
let immediateRunning = false;
let normalRunning = false;
let lastConnectFailedAt = 0;
const CONNECT_BACKOFF_MS = 60000;

const BATCH_SIZE = 50;

function createKafkaClient() {
  if (kafka) return kafka;
  kafka = new Kafka({
    clientId: `maitri-station-${process.env.STATION_CODE || 'MAITRI'}`,
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    retry: { retries: 3, initialRetryTime: 500, maxRetryTime: 5000 },
    logLevel: 4,
  });
  return kafka;
}

async function getProducer() {
  if (producer) return producer;
  const client = createKafkaClient();
  producer = client.producer({ allowAutoTopicCreation: true });
  await producer.connect();
  return producer;
}

/**
 * Fetch a batch of pending outbox events for a given priority level.
 */
async function fetchPendingEvents(priority) {
  const result = await pool.query(
    `SELECT id, entity_table, entity_id, operation, payload, priority, created_at, kafka_topic
     FROM outbound_sync_events
     WHERE kafka_produced_at IS NULL AND priority = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [priority, BATCH_SIZE]
  );
  return result.rows;
}

/**
 * Produce a batch of outbox events to Kafka and mark them as produced.
 * Uses sendBatch for efficiency. Updates each row individually after
 * the batch ack (kafkajs returns per-topic offsets in the batch response).
 */
async function produceBatch(events) {
  if (events.length === 0) return;

  // Skip if Kafka recently failed — back off for CONNECT_BACKOFF_MS
  if (Date.now() - lastConnectFailedAt < CONNECT_BACKOFF_MS) {
    return;
  }

  let prod;
  try {
    prod = await getProducer();
  } catch (err) {
    lastConnectFailedAt = Date.now();
    producer = null;
    kafka = null;
    console.warn('[kafka-producer] connection failed, will retry later:', err.message);
    return;
  }

  const topicMessages = events.map((evt) => ({
    key: evt.entity_id,
    value: JSON.stringify({
      event_id: evt.id,
      entity_table: evt.entity_table,
      entity_id: evt.entity_id,
      operation: evt.operation,
      payload: evt.payload,
      priority: evt.priority,
      created_at: evt.created_at,
    }),
    topic: evt.kafka_topic || process.env.KAFKA_TOPIC || 'maitri.station.events',
  }));

  // Group messages by topic for sendBatch
  const messagesByTopic = {};
  for (const msg of topicMessages) {
    if (!messagesByTopic[msg.topic]) messagesByTopic[msg.topic] = [];
    messagesByTopic[msg.topic].push({ key: msg.key, value: msg.value });
  }

  const batches = Object.entries(messagesByTopic).map(([topic, messages]) => ({
    topic,
    messages,
  }));

  const result = await prod.sendBatch({ topicMessages: batches });

  // kafkajs sendBatch returns one result per topic.
  // Track per-topic offset using a running counter per topic.
  const topicOffsetMap = {};
  for (const r of result) {
    topicOffsetMap[r.topicName] = parseInt(r.baseOffset, 10);
  }

  const now = new Date();
  for (const evt of events) {
    const topicName = evt.kafka_topic || process.env.KAFKA_TOPIC || 'maitri.station.events';
    const offset = topicOffsetMap[topicName] != null ? topicOffsetMap[topicName]++ : null;

    await pool.query(
      `UPDATE outbound_sync_events
       SET kafka_produced_at = $1, kafka_offset = $2
       WHERE id = $3`,
      [now, offset, evt.id]
    );
  }

  return result;
}

/**
 * One tick of the immediate-priority poll loop.
 * Exported separately for testing.
 */
async function pollImmediate() {
  const events = await fetchPendingEvents('immediate');
  if (events.length === 0) return;
  await produceBatch(events);
}

/**
 * One tick of the normal-priority poll loop.
 * Exported separately for testing.
 */
async function pollNormal() {
  const events = await fetchPendingEvents('normal');
  if (events.length === 0) return;
  await produceBatch(events);
}

/**
 * Start both polling loops. Called once from server.js at startup.
 * Uses a running flag to prevent overlapping executions.
 */
function startProducerLoops() {
  const immediateSeconds = parseInt(process.env.OUTBOX_IMMEDIATE_POLL_SECONDS, 10) || 5;
  const normalMinutes = parseInt(process.env.OUTBOX_FLUSH_INTERVAL_MINUTES, 10) || 10;

  console.log(`[kafka-producer] starting — immediate every ${immediateSeconds}s, normal every ${normalMinutes}min`);

  // Immediate loop
  setInterval(async () => {
    if (immediateRunning) return;
    immediateRunning = true;
    try {
      await pollImmediate();
    } catch (err) {
      console.error('[kafka-producer] immediate poll error:', err.message);
    } finally {
      immediateRunning = false;
    }
  }, immediateSeconds * 1000);

  // Normal loop
  setInterval(async () => {
    if (normalRunning) return;
    normalRunning = true;
    try {
      await pollNormal();
    } catch (err) {
      console.error('[kafka-producer] normal poll error:', err.message);
    } finally {
      normalRunning = false;
    }
  }, normalMinutes * 60 * 1000);
}

/**
 * Graceful shutdown — disconnect the producer.
 */
async function stopProducer() {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
  kafka = null;
}

module.exports = {
  startProducerLoops,
  stopProducer,
  pollImmediate,
  pollNormal,
  fetchPendingEvents,
  produceBatch,
  getProducer,
};
