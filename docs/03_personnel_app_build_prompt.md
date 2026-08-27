# Build Prompt — PolarOps Personnel App (Flutter, field crew)

## Context

You are building **one of three services** in PolarOps, a logistics and
asset-management platform for India's Antarctic expeditions (SIH 2026,
PS ID 26062, team ARJUN). Two teammates are building the other two
services in parallel:

- **Teammate A**: Central server + admin web UI.
- **Teammate B**: Maitri station server + local ops UI.
- **Teammate C (you)**: Personnel mobile app — this prompt.

You will be given, alongside this prompt: `01_central_server_schema.sql`,
`02_maitri_station_schema.sql`, `03_mobile_app_schema.sql`, and
`README.md`. **Read all four before writing code**, but
`03_mobile_app_schema.sql` is your primary spec — it's written to map
1:1 onto Drift table classes.

## Your scope

You're building the app that field personnel at Maitri actually carry
and use, hours from any connectivity. Every screen and every write in
this app must work with **zero network access**, full stop. Nothing
should ever spin, block, or fail because a request couldn't reach a
server. The one thing you're allowed to assume is unreliable is the
network — everything else (local storage, the outbox, the UI) must be
rock solid offline.

You do **not** own any server-side code. Your only external
integration point is one HTTP endpoint on the station server
(`POST /api/sync/push`, described below) — you never talk to the
central server directly.

## Tech stack (fixed)

- **Framework**: Flutter
- **Local database**: SQLite via **Drift** — use
  `03_mobile_app_schema.sql` as the source for your Drift table
  definitions (each `CREATE TABLE` maps to one `@DataClassName` table
  class; TEXT/INTEGER/REAL map directly to Drift's `text()`,
  `integer()`, `real()` column builders)
- **Background work**: use `workmanager` or Flutter's platform
  background-task APIs for the location-buffer rollup and the sync
  flush loop — both need to keep running even when the app isn't in
  the foreground
- **HTTP**: `dio` or similar, pointed at the station server's base URL
  (make this configurable — it'll differ between dev/staging and the
  real Maitri deployment)

## Core responsibilities, in build order

### 1. Local-first data layer (build this first)

- Set up Drift with every table in `03_mobile_app_schema.sql`.
- Every feature screen writes to its `*_local` table **first and
  only** — the UI never waits on a network call to consider an action
  "saved." A save is complete the moment it's committed to SQLite.
- Every write to a syncable table also inserts a row into
  `outbox_queue` in the same Drift transaction. Build one repository
  helper that does both (table write + outbox insert) so no feature
  code can accidentally forget the outbox half.

### 2. Self-provisioning / offline login

- `self_profile` is populated once, at setup time, while the device
  has connectivity (or via a QR code / manual entry flow if the
  station server issues one — your call on the exact provisioning UX,
  but the end state must be: `self_profile` + a cached
  `auth_token_hash` stored locally, so every subsequent app launch can
  authenticate the user with zero network calls).
- Don't build a traditional "log in every session" flow — this is a
  device that belongs to one person, for one expedition; log in once
  at setup.

### 3. Feature screens

- **Field Updates**: form for daily activity / site conditions / notes,
  with optional photo attachment (store the file locally, path in
  `attachment_paths` as a JSON array; upload happens later, opportunistically,
  when the outbox flush has connectivity — don't block the save on
  the upload).
- **Cargo Handling**: scan (barcode/QR via camera), upload photo,
  verify, confirm — this is a 4-stage flow matching
  `cargo_items_local.status`. Each stage transition is its own local
  update + outbox entry, so a partially-completed cargo item (scanned
  but not yet confirmed) is still visible and resumable if the app is
  closed mid-flow.
- **Resource Usage**: quick-entry form for fuel/power/equipment usage
  (`resource_usage_local`).
- **Location Updates**: background GPS tracking — see the batching
  section below, this is not a simple "insert on every reading" screen.
- **SOS**: a single, unmissable, hard-to-mis-tap button. On tap: write
  to `sos_incidents_local` immediately, enqueue with `priority =
  'immediate'`, and — critically — trigger an out-of-band sync attempt
  right away rather than waiting for the normal flush interval (see
  sync engine below). Show clear on-screen confirmation that the
  report was saved locally even if it hasn't reached the station
  server yet — the person needs to know their SOS was captured
  regardless of connectivity.
- A persistent, always-visible connectivity/sync-status indicator
  (online/offline, pending outbox count) — field personnel need to
  trust the app is actually saving their work.

### 4. Location batching (don't skip this — see README)

- Every raw GPS reading goes into `location_ping_buffer` — this table
  is never synced and never touched by the outbox.
- A background job rolls up whatever's in the buffer into a single
  `location_tracks_local` row (JSON array in `points_json`) every ~2-5
  minutes, or every ~50 points, whichever comes first — then clears
  the buffer. Make the interval/count thresholds configurable
  constants, not hardcoded magic numbers buried in the job.
- Only the rolled-up `location_tracks_local` row gets an
  `outbox_queue` entry — never enqueue individual pings.

### 5. Sync engine

- `connectivity_log` gets a row on every connectivity check
  (`connectivity_plus` package or platform APIs work fine); the sync
  engine consults the latest row before attempting a flush.
- Normal flush loop: when online, batch pending `outbox_queue` rows
  (respecting `priority` — immediate first), POST them to the station
  server's `/api/sync/push`:

```
POST {station_base_url}/api/sync/push
Auth: Bearer <cached device token>
Body: {
  device_id: <self_profile.device_id>,
  batch_id: <new uuid, one per flush attempt>,
  records: [
    { entity_table, entity_id, operation, payload }
    // payload = full JSON snapshot of the local row, as stored in
    // outbox_queue.payload_json
  ]
}
```

- On success, mark each accepted record's source row `is_synced = 1`
  and the `outbox_queue` row `status = 'sent'`. On partial success
  (per-record rejections in the response), only mark the accepted ones
  synced — leave rejected ones `pending` and log the reason for
  debugging.
- On failure (no response, timeout, 5xx), leave everything `pending`,
  increment `attempt_count`/`last_attempt_at`, back off before
  retrying — don't hammer a flaky satellite link with tight retries.
- SOS (`priority = 'immediate'`) rows should trigger their own
  out-of-cycle flush attempt the moment they're enqueued, in addition
  to being included in the next normal flush if that attempt fails.
- Record one `sync_batches_local` row per flush attempt, keyed by the
  `batch_id` you send — this is what makes a retried flush idempotent
  on the station server side (it checks `(device_id, batch_id)`).

### 6. Reference data cache

- `personnel_cache` and `expedition_cache` are read-only, refreshed
  opportunistically whenever the app is online (a simple periodic
  pull is fine for MVP — the exact endpoint depends on what teammate B
  exposes on the station server; coordinate with them, or stub it
  with fixture data and wire it up once their endpoint exists).

## Explicit non-goals

- No server code, no admin features, no cross-personnel data beyond
  the read-only cache.
- No AI/risk features — you only produce the raw data those depend on.
- Don't build a "retry forever aggressively" sync loop — respect the
  satellite link, back off on failure.

## Milestones

1. Drift schema set up from `03_mobile_app_schema.sql`, provisioning
   flow producing a valid `self_profile` row.
2. One feature screen end-to-end (start with Field Updates — it's the
   simplest) proving the write → outbox → local-only round trip works
   with the app fully offline.
3. Location buffer + rollup job running in the background, verified by
   inspecting `location_tracks_local` after a few minutes of simulated
   movement.
4. Sync engine talking to a **stubbed** `/api/sync/push` (a local mock
   server is fine) — don't block on teammate B's real endpoint to make
   progress here.
5. Remaining feature screens (Cargo Handling, Resource Usage, SOS).
6. Swap the stub for teammate B's real station-server endpoint; test
   airplane-mode → make several entries → SOS → go back online →
   confirm everything drains from the outbox in the right priority
   order.
