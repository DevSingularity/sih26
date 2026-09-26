# Build Prompt — PolarOps Central Server (India HQ / NCPOR)

## Context

You are building **one of three services** in PolarOps, a logistics and
asset-management platform for India's Antarctic expeditions (SIH 2026,
PS ID 26062, team ARJUN). Two teammates are building the other two
services in parallel:

- **Teammate A (you)**: Central server + admin web UI — this prompt.
- **Teammate B**: Maitri station server + local ops UI.
- **Teammate C**: Personnel mobile app (Flutter, on-ground crew).

You will be given, alongside this prompt: `01_central_server_schema.sql`,
`02_maitri_station_schema.sql`, `03_mobile_app_schema.sql`, and
`README.md`. **Read all four before writing code** — the other two
schemas tell you exactly what shape of data will arrive at your ingest
endpoint, and the README explains the sync/conflict model you must
implement correctly.

## Your scope

You own **everything that only makes sense with the full, cross-station
picture**: the source-of-truth database, the ingestion pipeline that
receives batches from every station, the AI/risk intelligence layer,
RBAC, expedition planning, and the NCPOR admin dashboard.

You do **not** own: anything that runs at a station or on a phone. You
never talk to a phone directly. Your only inbound data path from the
field is the Kafka topic your teammate's station server produces to.

## Tech stack (fixed, per the project's tech-stack decision)

- **Backend**: Node.js + Express (REST API)
- **Frontend**: Next.js (PWA) — the NCPOR admin dashboard
- **Database**: PostgreSQL (+ PostGIS if you need real geospatial
  queries — see the note at the bottom of `01_central_server_schema.sql`)
- **Event ingestion**: Apache Kafka consumer (topic:
  `maitri.station.events`, and equivalent topics per station if/when
  Bharati gets its own server — don't hardcode a single-topic
  assumption)
- Use `01_central_server_schema.sql` as your DDL, as-is. If you need to
  alter it, keep the sync columns (`origin_station_id`,
  `origin_device_id`, `client_updated_at`, `server_received_at`,
  `sync_version`, `is_deleted`) intact on every syncable table — the
  conflict-resolution logic below depends on them.

## Core responsibilities, in build order

### 1. Kafka consumer + LWW ingestion pipeline (build this first — it's the spine)

- Consume from `maitri.station.events` (and design it to generalize to
  multiple station topics).
- Each message payload matches a row from the station server's
  `outbound_sync_events` table: `{ entity_table, entity_id, operation,
  payload, priority, ... }`.
- For each message:
  - `insert`/`update` on an **event table** (`field_updates`,
    `location_tracks`, `resource_usage_logs`, `sos_incidents`,
    `inventory_transactions`) → plain insert, keyed on the
    client-generated `id`. Use `ON CONFLICT (id) DO NOTHING` — these
    are idempotent by design, never conflict-resolved.
  - `insert`/`update` on a **mutable entity** (`cargo_shipments`,
    `cargo_items`, `inventory_stock`, `personnel`) → compare incoming
    `client_updated_at` against the stored row's `client_updated_at`.
    Incoming wins only if it's strictly newer. Either way, write a row
    to `sync_conflicts` if a losing write was discarded, and bump
    `sync_version` on every accepted write.
  - `priority: 'immediate'` messages (SOS) should be processed
    out-of-band from the normal batch cadence — don't let them wait
    behind a full 10-minute batch of low-priority events if your
    consumer group is doing batched commits.
- Record every consumed batch in `sync_batches` (source station, Kafka
  offset range, record count, status).
- Write a small integration test that feeds two conflicting updates
  for the same `cargo_items.id` with different `client_updated_at` and
  asserts the older one lands in `sync_conflicts`, not in the live row.

### 2. Admin-sync-down endpoint (for the station server to pull)

Station servers need to cache `personnel` and `expeditions` locally so
field ops work offline. Expose:

```
GET /api/stations/:station_code/sync-down?since=<ISO timestamp>
Auth: service-to-service API key (station server credential)
Response: { personnel: [...], expeditions: [...], server_time: <ISO> }
```

Only return rows updated after `since`. The station server will call
this on its own schedule — you don't push to it.

### 3. Core REST API for the admin UI

Build authenticated (`admin_users`, JWT or session-based) endpoints
for at least:

- `POST /api/auth/login`, RBAC-aware middleware keyed on
  `admin_users.role` (`super_admin`, `ops_manager`,
  `logistics_officer`, `viewer`)
- `GET/POST /api/expeditions`, `GET/POST /api/expeditions/:id/legs`
- `GET /api/cargo/shipments`, `GET /api/cargo/items?station_id=&status=`
- `GET /api/inventory?station_id=`
- `GET /api/resources/usage?station_id=&from=&to=`
- `GET /api/personnel?station_id=`
- `GET /api/sos?status=open` (for the emergency response view)
- `GET /api/alerts?station_id=&status=open`
- `GET /api/stations/:id/snapshot` — backs the digital twin / dashboard

### 4. Decision Intelligence (rule engine + AI layer)

This is the feature that only exists here, because only you have the
full multi-station dataset:

- `risk_thresholds` CRUD (admin-configurable per station/metric)
- A scheduled job (e.g. every 5 min, or triggered after each sync
  batch) that evaluates current `resources`/`inventory_stock` levels
  against `risk_thresholds` and inserts into `risk_predictions` and
  `alerts` when breached. Start with a simple rule engine
  (threshold comparison); note in your code where a real ML model
  would plug in later — don't over-engineer this for the MVP.
- `flight_readiness_assessments`: a simpler rule-based scorer
  combining a weather snapshot (stub this — real weather feed
  integration is out of scope for MVP) + current resource levels.
- `ai_recommendations`: free-text suggestions attached to an alert or
  SOS incident. A canned/rule-based recommendation generator is fine
  for MVP; keep the schema's `model_version` field so a real model can
  be swapped in without a schema change.

### 5. Notifications

- `alert_notifications` dispatch: in-app is required for MVP; wire up
  at least one of SMS/WhatsApp/email via a provider of your choice
  (Twilio, MSG91, etc. — pick one, document the env vars needed) and
  leave the others as clearly-marked stubs.

### 6. Admin dashboard (Next.js PWA)

Screens, matching the PPT feature list:

- Login
- Operation Dashboard (station status, active alerts count, cargo/
  personnel/resource summary — reads `station_snapshots`)
- Live 2-D Digital Twin (a simple map/floor-plan view of
  station state; doesn't need to be fancy for MVP — a schematic SVG
  with live-updating counts is fine)
- Cargo & Inventory management
- Shipment Tracking (map or timeline of `cargo_shipments`)
- Resource Management (fuel/power/equipment levels + usage history)
- Risk & Alert center (list + detail, acknowledge/resolve actions)
- AI Recommendation panel (surfaced alongside alerts/SOS)
- Expedition planning (create/edit expeditions and legs)
- SOS / Emergency response view — this should be the most prominent,
  hardest-to-miss screen in the app

## Explicit non-goals (don't build these — another teammate owns them)

- Anything that runs offline-first on a phone.
- The Maitri station's local ops UI.
- Cargo scanning/barcode UI (that's the mobile app; you only ever
  *receive* the already-scanned record).

## Milestones

1. DB migrations from `01_central_server_schema.sql` running clean;
   Kafka consumer skeleton logging received messages.
2. LWW ingestion pipeline complete + tested against both schema files
   from the other two services (ask teammates for sample payloads
   early — don't wait for their services to be finished).
3. Core REST API + auth working against Postman/curl.
4. Admin dashboard shell (routing, auth, layout) wired to real
   endpoints, screen by screen.
5. Risk/alert rule engine + notifications.
6. End-to-end demo: simulate a Kafka message by hand (no need to wait
   on the station server), watch it land in the DB, appear on the
   dashboard, and (if it breaches a threshold) fire an alert.
