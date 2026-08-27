const express = require('express');
const app = express();

app.use(express.json());

// Feature routes
app.use('/api/sync', require('./features/sync/routes/sync.routes'));
app.use('/api/sync-health', require('./features/sync/routes/syncHealth.routes'));
app.use('/api/sync-down', require('./features/sync/routes/syncDown.routes'));
app.use('/api/sos', require('./features/sos/routes'));
app.use('/api/alerts', require('./features/alerts/routes'));
app.use('/api/cargo', require('./features/cargo/routes'));
app.use('/api/dashboard', require('./features/dashboard/routes'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

module.exports = app;
