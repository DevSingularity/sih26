const express = require('express');
const app = express();

// CORS — allow the Next.js admin dashboard on :3000 to call this API
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Station-Api-Key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

// Feature-first layout: each feature owns its routes, controllers, services,
// repositories, jobs, and integration code. Shared cross-cutting code lives
// under ./shared.
app.use('/api/auth', require('./features/auth/routes/auth.routes'));
app.use('/api/expeditions', require('./features/expeditions/routes/expeditions.routes'));
app.use('/api/cargo', require('./features/cargo/routes/cargo.routes'));
app.use('/api/inventory', require('./features/inventory/routes/inventory.routes'));
app.use('/api/resources', require('./features/resources/routes/resources.routes'));
app.use('/api/personnel', require('./features/personnel/routes/personnel.routes'));
app.use('/api/sos', require('./features/sos/routes/sos.routes'));
app.use('/api/alerts', require('./features/alerts/routes/alerts.routes'));
app.use('/api/risk/thresholds', require('./features/risk/routes/riskThresholds.routes'));
app.use('/api/stations', require('./features/stations/routes/stations.routes'));
app.use('/api/stations', require('./features/stations/routes/snapshot.routes'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

module.exports = app;
