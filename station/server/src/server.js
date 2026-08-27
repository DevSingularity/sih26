// Entry point — Express app + starts the outbox->Kafka producer loop and
// the admin-sync-down puller. See /docs/02_station_server_build_prompt.md.
require('dotenv').config();
const app = require('./app');
const { startProducerLoops, stopProducer } = require('./features/sync/kafka/producer');

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`[station-server:${process.env.STATION_CODE || 'MAITRI'}] listening on :${PORT}`);
});

// Start the outbox → Kafka producer loops (immediate + normal cadence)
startProducerLoops();

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
