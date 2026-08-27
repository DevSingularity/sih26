const { Kafka } = require('kafkajs');
const pool = require('../../../shared/config/db');

let producer = null;
let kafka = null;

const BATCH_SIZE = 50;

function createKafkaClient() {
  if (kafka) return kafka;
  kafka = new Kafka({
    clientId: `maitri-station-${process.env.STATION_CODE || 'MAITRI'}`,
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    retry: { retries: 8, initialRetryTime: 100, maxRetryTime: 30000 },
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

  const prod = await getProducer();

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

  // kafkajs sendBatch returns one result per topic, not per message.
  // We use baseOffset + message index as the approximate offset for each
  // message in the batch. This is a known simplification — if a partial
  // failure occurs, the entire batch would need to be retried. The tradeoff
  // is efficiency (one network round-trip) vs granularity (per-message ack).
  const now = new Date();
  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    const topicName = evt.kafka_topic || process.env.KAFKA_TOPIC || 'maitri.station.events';
    const topicResult = result.find(r => r.topicName === topicName);
    const offset = topicResult ? parseInt(topicResult.baseOffset, 10) + i : null;

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
 * - Immediate loop: polls every OUTBOX_IMMEDIATE_POLL_SECONDS (default 5s)
 *   for SOS / priority='immediate' events. These must be flushed ASAP,
 *   not batched on a 10-minute cadence.
 * - Normal loop: polls every OUTBOX_FLUSH_INTERVAL_MINUTES (default 10 min)
 *   for all other events. This matches the architecture's stated sync
 *   interval and keeps batch sizes reasonable.
 *
 * The two-loop design avoids needing a single combined query with
 * ORDER BY priority DESC — the immediate loop naturally fires far more
 * often, so immediate events are always picked up within seconds without
 * polluting the normal loop's 10-minute cadence.
 */
function startProducerLoops() {
  const immediateSeconds = parseInt(process.env.OUTBOX_IMMEDIATE_POLL_SECONDS, 10) || 5;
  const normalMinutes = parseInt(process.env.OUTBOX_FLUSH_INTERVAL_MINUTES, 10) || 10;

  console.log(`[kafka-producer] starting — immediate every ${immediateSeconds}s, normal every ${normalMinutes}min`);

  // Immediate loop
  setInterval(async () => {
    try {
      await pollImmediate();
    } catch (err) {
      console.error('[kafka-producer] immediate poll error:', err.message);
    }
  }, immediateSeconds * 1000);

  // Normal loop
  setInterval(async () => {
    try {
      await pollNormal();
    } catch (err) {
      console.error('[kafka-producer] normal poll error:', err.message);
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
