const express = require('express');
const app = express();

app.use(express.json());

// Feature routes
app.use('/api/sync', require('./features/sync/routes/sync.routes'));
app.use('/api/sync-down', require('./features/sync/routes/syncDown.routes'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

module.exports = app;
