// Consumes maitri.station.events (and any other `<code>.station.events`
// topic — see topics.js) and applies the Last-Write-Wins ingestion
// logic from ../ingestion/applyEvent.js. This is the spine of the
// central server: build/run this before anything else.
//
// Priority handling: normal-priority messages are buffered per
// topic-partition and flushed together every SYNC_BATCH_INTERVAL_MS
// (default 10 min) so sync_batches reflects real batch cadence.
// 'immediate' (SOS) messages skip the buffer entirely — they're applied
// and committed the moment they're received, so an SOS report is never
// stuck waiting behind a full low-priority batch window.
const { Kafka, logLevel } = require('kafkajs');
const { getStationTopics } = require('./topics');
const { createPgStore } = require('../store/pgStore');
const { createStationResolver } = require('../store/stationResolver');
const { processBatch } = require('../ingestion/processBatch');

const DEFAULT_BATCH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes, per the sync design doc

function bufferKey(topic, partition) {
  return `${topic}::${partition}`;
}

/**
 * @param {import('pg').Pool} pool
 */
function createSyncConsumer(pool, { env = process.env } = {}) {
  const kafka = new Kafka({
    clientId: 'central-server-sync-ingestion',
    brokers: (env.KAFKA_BROKERS || 'localhost:9092').split(',').map((b) => b.trim()),
    logLevel: logLevel.ERROR,
  });

  const consumer = kafka.consumer({ groupId: env.KAFKA_CONSUMER_GROUP || 'central-server-group' });
  const store = createPgStore(pool);
  const stationResolver = createStationResolver(pool);

  const batchIntervalMs = Number(env.SYNC_BATCH_INTERVAL_MS) || DEFAULT_BATCH_INTERVAL_MS;

  /** @type {Map<string, { events: object[], offsetStart: string, offsetEnd: string, partition: number, topic: string }>} */
  const buffers = new Map();
  let flushTimer = null;

  async function flushBuffer(key) {
    const buffer = buffers.get(key);
    buffers.delete(key);
    if (!buffer || buffer.events.length === 0) return;

    const { topic, partition, events, offsetStart, offsetEnd } = buffer;

    const sourceStationId = await stationResolver.resolveStationIdForTopic(
      topic,
      events[0].payload,
    );
    if (!sourceStationId) {
      // eslint-disable-next-line no-console
      console.error(
        `[sync-ingestion] could not resolve a station for topic "${topic}" — is there a ` +
          'matching row in `stations` (code = topic prefix, uppercased)? Dropping this flush ' +
          `without committing offsets so it will be retried (${events.length} events).`,
      );
      // Put events back so the next flush retries them, and don't
      // commit offsets — safer to reprocess than to silently lose data.
      buffers.set(key, buffer);
      return;
    }

    const { status, errorCount } = await processBatch(store, {
      sourceStationId,
      kafkaTopic: topic,
      kafkaOffsetStart: Number(offsetStart),
      kafkaOffsetEnd: Number(offsetEnd),
      events,
    });

    // eslint-disable-next-line no-console
    console.log(
      `[sync-ingestion] flushed batch: topic=${topic} partition=${partition} ` +
        `records=${events.length} status=${status} errors=${errorCount}`,
    );

    await consumer.commitOffsets([{ topic, partition, offset: String(BigInt(offsetEnd) + 1n) }]);
  }

  async function flushAll() {
    await Promise.all(Array.from(buffers.keys()).map(flushBuffer));
  }

  async function processImmediate(topic, partition, message, event) {
    const sourceStationId = await stationResolver.resolveStationIdForTopic(topic, event.payload);
    if (!sourceStationId) {
      // eslint-disable-next-line no-console
      console.error(
        `[sync-ingestion] could not resolve a station for topic "${topic}" — dropping immediate ` +
          `message without committing offset (entity=${event.entity_table}/${event.entity_id}).`,
      );
      return;
    }

    const { status } = await processBatch(store, {
      sourceStationId,
      kafkaTopic: topic,
      kafkaOffsetStart: Number(message.offset),
      kafkaOffsetEnd: Number(message.offset),
      events: [event],
    });

    // eslint-disable-next-line no-console
    console.log(
      `[sync-ingestion] IMMEDIATE ${event.entity_table}/${event.entity_id} from ${topic} -> ${status}`,
    );

    await consumer.commitOffsets([
      { topic, partition, offset: String(BigInt(message.offset) + 1n) },
    ]);
  }

  async function start() {
    const topics = getStationTopics(env);
    await consumer.connect();
    await Promise.all(topics.map((topic) => consumer.subscribe({ topic, fromBeginning: false })));

    // Manual offset commits only (see flushBuffer / processImmediate) —
    // autoCommit could ack a normal-priority message's offset before
    // its buffered batch is actually flushed and applied.
    await consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        let event;
        try {
          event = JSON.parse(message.value.toString('utf8'));
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`[sync-ingestion] dropping unparseable message on ${topic}:${partition}`, err);
          await consumer.commitOffsets([
            { topic, partition, offset: String(BigInt(message.offset) + 1n) },
          ]);
          return;
        }

        if (event.priority === 'immediate') {
          await processImmediate(topic, partition, message, event);
          return;
        }

        const key = bufferKey(topic, partition);
        const existing = buffers.get(key);
        if (existing) {
          existing.events.push(event);
          existing.offsetEnd = message.offset;
        } else {
          buffers.set(key, {
            topic,
            partition,
            events: [event],
            offsetStart: message.offset,
            offsetEnd: message.offset,
          });
        }
      },
    });

    flushTimer = setInterval(() => {
      flushAll().catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[sync-ingestion] scheduled flush failed:', err);
      });
    }, batchIntervalMs);

    // eslint-disable-next-line no-console
    console.log(
      `[sync-ingestion] consuming ${topics.join(', ')} (batch flush every ${batchIntervalMs}ms, ` +
        'immediate/SOS messages processed out-of-band)',
    );
  }

  async function stop() {
    if (flushTimer) clearInterval(flushTimer);
    await flushAll().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[sync-ingestion] final flush on shutdown failed:', err);
    });
    await consumer.disconnect();
  }

  return { start, stop };
}

module.exports = { createSyncConsumer };
