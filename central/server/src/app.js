const express = require('express');
const app = express();

app.use(express.json());

// Feature-first layout: each feature owns its routes, controllers, services,
// repositories, jobs, and integration code. Shared cross-cutting code lives
// under ./shared.

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

module.exports = app;
