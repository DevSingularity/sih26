const express = require('express');
const app = express();

app.use(express.json());

// Feature-first layout: feature-owned routes live inside their feature directory.
// Example: app.use('/api/sync', require('./features/sync/routes/sync.routes'));
// Shared cross-cutting code lives under ./shared.

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

module.exports = app;
