// Entry point — wires up Express app, DB pool, and starts the Kafka consumer.
// See /docs/01_central_server_build_prompt.md for the full build spec.
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[central-server] listening on :${PORT}`);
});

// TODO: start Kafka consumer from ./features/sync-ingestion/kafka/consumer.js here as well
