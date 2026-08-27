// Entry point — Express app + starts the outbox->Kafka producer loop and
// the admin-sync-down puller. See /docs/02_station_server_build_prompt.md.
require('dotenv').config();
const cron = require('node-cron');
const app = require('./app');
const { startProducerLoops, stopProducer } = require('./features/sync/kafka/producer');
const syncDown = require('./features/sync/service/syncDown');

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`[station-server:${process.env.STATION_CODE || 'MAITRI'}] listening on :${PORT}`);
});

// Start the outbox → Kafka producer loops (immediate + normal cadence)
startProducerLoops();

// Schedule admin sync-down pull from central server
const syncDownMinutes = parseInt(process.env.SYNC_DOWN_INTERVAL_MINUTES, 10) || 10;
cron.schedule(`*/${syncDownMinutes} * * * *`, async () => {
  console.log(`[sync-down] scheduled pull starting (every ${syncDownMinutes}min)`);
  try {
    const result = await syncDown();
    console.log(`[sync-down] completed:`, result.status, result.records_pulled || 0, 'records');
  } catch (err) {
    console.error('[sync-down] scheduled pull error:', err.message);
  }
});
console.log(`[sync-down] scheduled every ${syncDownMinutes} minutes`);

// Schedule threshold check every 5 minutes (safety net for inventory/resource breaches)
const checkThresholds = require('./features/alerts/thresholdCheck');
cron.schedule('*/5 * * * *', async () => {
  console.log('[thresholds] scheduled check starting');
  try {
    const result = await checkThresholds();
    if (result.checked > 0) {
      console.log(`[thresholds] raised ${result.checked} alerts`);
    }
  } catch (err) {
    console.error('[thresholds] scheduled check error:', err.message);
  }
});
console.log('[thresholds] scheduled every 5 minutes');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[station-server] SIGTERM received, shutting down...');
  server.close();
  await stopProducer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[station-server] SIGINT received, shutting down...');
  server.close();
  await stopProducer();
  process.exit(0);
});
