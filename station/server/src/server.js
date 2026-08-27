// Entry point — Express app + starts the outbox->Kafka producer loop and
// the admin-sync-down puller. See /docs/02_station_server_build_prompt.md.
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[station-server:${process.env.STATION_CODE || 'MAITRI'}] listening on :${PORT}`);
});

// TODO: start outbox producer loop (./features/sync/kafka/producer.js) and
// admin-sync-down scheduler (./jobs/syncDown.js) here as well
