// Entry point — wires up Express app, DB pool, Kafka consumer, and risk engine.
// See /docs/01_central_server_build_prompt.md for the full build spec.
require('dotenv').config();
const app = require('./app');
const pool = require('./shared/config/db');
const { createSyncConsumer } = require('./features/sync-ingestion/kafka/consumer');
const { startRiskEngine } = require('./features/risk/jobs/riskEngine');

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`[central-server] listening on :${PORT}`);
});

const syncConsumer = createSyncConsumer(pool);

syncConsumer.start().catch((err) => {
  console.error('[central-server] failed to start Kafka sync consumer (REST API still available):', err.message);
});

startRiskEngine();

async function shutdown(signal) {
  console.log(`[central-server] received ${signal}, shutting down...`);
  try {
    await syncConsumer.stop();
  } catch (err) {
    console.error('[central-server] error stopping sync consumer:', err);
  }
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
