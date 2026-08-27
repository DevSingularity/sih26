const { applyEvent } = require('./applyEvent');

/**
 * Applies a group of events (from one Kafka topic, one flush cycle) and
 * records exactly one sync_batches row summarizing the outcome.
 *
 * Each event is applied independently — a single bad/malformed event
 * doesn't roll back or block the rest of the batch, since these
 * batches often mix many unrelated stations'/personnel's writes. LWW
 * safety for a given row is still guaranteed because applyEvent()
 * itself wraps the read-compare-write for a single mutable row in its
 * own transaction (see applyEvent.js / store.withTransaction).
 *
 * @param {import('../store/syncStore.interface')} store
 * @param {object} opts
 * @param {string} opts.sourceStationId  stations.id this batch came from
 * @param {string} opts.kafkaTopic
 * @param {number|null} [opts.kafkaOffsetStart]
 * @param {number|null} [opts.kafkaOffsetEnd]
 * @param {object[]} opts.events  raw outbound_sync_events-shaped messages
 * @returns {Promise<{batchId: string, status: string, results: object[], errorCount: number}>}
 */
async function processBatch(store, opts) {
  const { sourceStationId, kafkaTopic, kafkaOffsetStart = null, kafkaOffsetEnd = null, events } = opts;

  const results = [];
  let errorCount = 0;

  for (const event of events) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await applyEvent(store, event);
      results.push(result);
    } catch (err) {
      errorCount += 1;
      results.push({
        status: 'error',
        table: event?.entity_table ?? null,
        id: event?.entity_id ?? null,
        reason: err.message,
      });
      // eslint-disable-next-line no-console
      console.error(
        `[sync-ingestion] failed to apply event ${event?.entity_table}/${event?.entity_id} ` +
          `from topic ${kafkaTopic}:`,
        err,
      );
    }
  }

  let status = 'processed';
  if (events.length === 0) {
    status = 'processed';
  } else if (errorCount === events.length) {
    status = 'failed';
  } else if (errorCount > 0) {
    status = 'partial';
  }

  const batch = await store.recordBatch({
    source_station_id: sourceStationId,
    kafka_topic: kafkaTopic,
    kafka_offset_start: kafkaOffsetStart,
    kafka_offset_end: kafkaOffsetEnd,
    record_count: events.length,
    status,
  });

  return { batchId: batch.id, status, results, errorCount };
}

module.exports = { processBatch };
