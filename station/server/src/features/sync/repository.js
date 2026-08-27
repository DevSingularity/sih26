const pool = require('../../shared/config/db');

async function getSyncHealth() {
  const [pendingResult, lastKafkaResult, lastSyncDownResult] = await Promise.all([
    pool.query('SELECT count(*) FROM outbound_sync_events WHERE kafka_produced_at IS NULL'),
    pool.query('SELECT MAX(kafka_produced_at) as last_produce FROM outbound_sync_events'),
    pool.query(
      "SELECT completed_at, status, records_pulled FROM sync_down_runs WHERE status = 'success' ORDER BY completed_at DESC LIMIT 1"
    ),
  ]);

  return {
    pending_outbox_count: parseInt(pendingResult.rows[0].count, 10),
    last_kafka_produce_at: lastKafkaResult.rows[0].last_produce || null,
    last_sync_down: lastSyncDownResult.rows[0] || null,
  };
}

module.exports = { getSyncHealth };
