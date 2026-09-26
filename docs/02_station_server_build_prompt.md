# Build Prompt — PolarOps Maitri Station Server (Antarctic side)

## Context

You are building **one of three services** in PolarOps, a logistics and
asset-management platform for India's Antarctic expeditions (SIH 2026,
PS ID 26062, team ARJUN). Two teammates are building the other two
services in parallel:

- **Teammate A**: Central server + admin web UI.
- **Teammate B (you)**: Maitri station server + local ops UI — this prompt.
- **Teammate C**: Personnel mobile app (Flutter, on-ground crew).

You will be given, alongside this prompt: `01_central_server_schema.sql`,
`02_maitri_station_schema.sql`, `03_mobile_app_schema.sql`, and
`README.md`. **Read all four before writing code.** You sit in the
middle of the pipeline — you need to know the exact shape of what the
phone sends you (schema 3) and the exact shape of what you must
produce for the central server to consume (schema 1's sync columns).

## Your scope

You are the **local source of truth for Maitri station**, and the only
reason this whole architecture works when the satellite link is down
for hours: field personnel's phones sync to *you*, not to India. You
own the local ops database, the ingestion endpoint personnel phones
push to, the transactional-outbox → Kafka producer, and a local
dashboard the station commander can use even with zero connectivity to
India.

You are explicitly **single-station scoped** — this server only ever
knows about Maitri. Don't build any multi-station table or logic; if
Bharati needs the same thing later, it's a separate deployment of this
same codebase, not a shared table.

You do **not** own: RBAC/admin-user management, AI risk scoring,
expedition authorship, or notification dispatch (SMS/WhatsApp/email) —
those only make sense with the full cross-station picture and live on
the central server. You also never talk to the central server over
REST for these features — see the Kafka contract below.

## Tech stack (fixed)

- **Backend**: Node.js + Express
- **Database**: PostgreSQL, using `02_maitri_station_schema.sql` as-is.
  Keep the sync columns (`origin_device_id`, `client_updated_at`,
  `server_received_at`, `sync_version`, `is_deleted`,
  `pushed_to_kafka_at`) intact — the outbox pattern below depends on
  them.
- **Local UI**: Next.js. It's fine for this to be a lighter build than
  the central admin dashboard — this is a working tool for one station
  commander, not a multi-tenant product.
- **Event production**: Apache Kafka producer, topic
  `maitri.station.events` (per `outbound_sync_events.kafka_topic`
  default in the schema).
- **Offline resilience**: this server itself should tolerate the
  *upstream* link (to India) being down indefinitely — it must keep
  serving phones and accepting writes locally regardless of Kafka
  connectivity. Kafka production failures should retry with backoff,
  never block or reject an incoming phone sync.

## Core responsibilities, in build order

### 1. Transactional outbox (build this first — everything else depends on it)

- Every insert/update to a syncable table (`cargo_shipments`,
  `cargo_items`, `inventory_stock`, `inventory_transactions`,
  `resource_usage_logs`, `field_updates`, `location_tracks`,
  `sos_incidents`, `local_threshold_alerts`) must, **in the same DB
  transaction**, insert a row into `outbound_sync_events` with a full
  JSON snapshot of the written row.
- Wrap this in a single reusable helper/repository method — don't
  hand-roll the outbox insert at every call site, or someone will
  eventually forget it.
- SOS writes get `priority = 'immediate'` in the outbox row; everything
  else gets `'normal'`.

### 2. Kafka producer

- A background worker polls `outbound_sync_events WHERE
  kafka_produced_at IS NULL ORDER BY priority DESC, created_at ASC`,
  produces each to `maitri.station.events`, and on ack sets
  `kafka_produced_at` + `kafka_offset`.
- Batch normal-priority events on a ~10-minute cadence (matches the
  architecture's stated sync interval). `immediate` priority events
  should be produced as soon as they appear, independent of that
  timer — poll for them on a much shorter interval (e.g. every few
  seconds) or push them the instant the outbox insert happens.
- If Kafka is unreachable, log and retry with backoff; never lose or
  drop a row — `outbound_sync_events` is your durable queue.

### 3. Phone ingestion endpoint

```
POST /api/sync/push
Auth: device bearer token (issued at phone provisioning)
Body: {
  device_id: uuid,
  batch_id: uuid,
  records: [
    { entity_table: string, entity_id: uuid, operation: 'insert'|'update', payload: {...} }
  ]
}
Response: { batch_id, status: 'applied'|'partial'|'failed', accepted: [entity_id...], rejected: [{entity_id, reason}] }
```

- Look up `(device_id, batch_id)` in `inbound_phone_batches` first —
  if it already exists, this is a retry; return the same result you
  gave last time without re-applying anything (idempotency).
- Otherwise, apply each record inside a transaction: map
  `entity_table` to the corresponding local table, upsert by the
  client-generated `id`, run the outbox insert (step 1) for each
  successfully-applied row, then write the `inbound_phone_batches` row.
- `location_tracks` records arrive pre-batched from the phone (one row
  = one JSON array of GPS points, not one row per ping) — just store
  them as-is, no reprocessing needed on your end.
- Return per-record accept/reject status so the phone's outbox can
  mark individual records synced even if others in the same batch
  failed validation.

### 4. Admin sync-down (pull from central)

Periodically (and/or on manual trigger from your local UI), call the
central server's:

```
GET /api/stations/MAITRI/sync-down?since=<last successful pull>
```

and upsert the results into `personnel_cache` and `expedition_cache`.
This is the only outbound call you make to the central server directly
(everything else flows through Kafka) — it's a small, infrequent pull,
not part of the main event pipeline.

### 5. Local ops UI (Next.js)

This is what the station commander looks at when India is
unreachable. Screens:

- Local dashboard: today's cargo activity, current inventory levels,
  active resource usage, who's currently checked in (from
  `personnel_cache` + recent `location_tracks`)
- Cargo & inventory list/detail (station-scoped, no cross-station data
  — you don't have any)
- SOS incident list — this should be the most visible screen; show
  open incidents prominently and let the commander update
  `status`/`acknowledged_at`/`resolved_at` directly (writes here also
  go through the outbox, same as everything else, so India eventually
  sees the update)
- Sync health panel: pending `outbound_sync_events` count, last
  successful Kafka produce, last successful admin sync-down — the
  commander needs to be able to see at a glance "are we backed up
  right now?"
- Local threshold alerts (`local_threshold_alerts`) list

### 6. Local threshold alerting

A lightweight rule check (simple comparison, run on a timer or after
each `resources`/`inventory_stock` write) against thresholds you can
hardcode or make locally configurable for MVP — this is deliberately
simpler than the central server's AI risk engine; it exists so the
station doesn't have to wait for a round-trip to India to know "we're
low on fuel."

## Explicit non-goals

- No RBAC/admin-user system — a single local login (or none, if this
  runs on a machine physically inside the station) is fine for MVP.
- No AI/ML risk scoring — that's central-only.
- No notification dispatch (SMS/WhatsApp/email) — central-only.
- No multi-station anything.

## Milestones

1. DB migrations from `02_maitri_station_schema.sql` running clean;
   outbox helper + a manual test insert producing an
   `outbound_sync_events` row.
2. Kafka producer working end-to-end against a local Kafka instance
   (or Redpanda for local dev) — confirm messages match what
   teammate A's consumer expects (coordinate a sample payload early).
3. `/api/sync/push` working against curl/Postman with a hand-built
   payload shaped like `03_mobile_app_schema.sql`'s `outbox_queue`
   rows — don't wait for the mobile app to be finished.
4. Admin sync-down pull working against a stub/mock of teammate A's
   endpoint if it isn't ready yet.
5. Local ops UI, screen by screen, starting with the SOS list and
   sync health panel (highest value for the least UI work).
6. End-to-end demo: hit `/api/sync/push` with a fake cargo-scan
   payload, watch it appear in the local UI, then in
   `outbound_sync_events`, then (once Kafka is wired) confirm it lands
   on the central server.
