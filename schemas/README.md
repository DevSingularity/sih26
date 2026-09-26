# PolarOps — Data Schema (3 tiers)

Three schema files, one per tier in the sync pipeline:

```
Personnel phone (Flutter/SQLite)  --outbox sync-->  Maitri station server (Postgres)
                                                              |
                                                    transactional outbox --> Kafka
                                                              |
                                              10-min batch consumer, Last-Write-Wins
                                                              v
                                            Central India HQ server (Postgres) -- source of truth
```

| File | Tier | Engine |
|---|---|---|
| `01_central_server_schema.sql` | India HQ (NCPOR) | PostgreSQL |
| `02_maitri_station_schema.sql` | Antarctic station (Maitri, single-station scope) | PostgreSQL |
| `03_mobile_app_schema.sql` | Personnel phone | SQLite (Drift) |

All three are syntax-validated (`pglast` for the two Postgres files, Python's `sqlite3` for the mobile one).

## Design decisions baked into the schema (per your answers)

- **Maitri server = single-station scope.** It only ever holds Maitri's own data. If Bharati gets its own field server later, it's the *same schema file*, deployed as its own instance with its own `station_info` row — not a shared multi-station table. This keeps each field server small and genuinely offline-resilient (no dependency on data from a station it isn't co-located with).
- **Conflict resolution = Last-Write-Wins on `client_updated_at`.** Every *mutable* row (cargo status, inventory counts, personnel profile, etc.) carries `origin_device_id`, `client_updated_at` (the device's clock at write time — this is what's compared), `server_received_at` (audit only, never used for resolution), and `sync_version` (a defense-in-depth counter to flag suspicious clock skew even though it isn't the primary resolution mechanism). Losing writes aren't dropped — they land in `sync_conflicts` on the central server for audit.
- **Append-only tables skip LWW entirely.** Field updates, location pings, resource-usage logs, and SOS reports are events, not mutable state — there's nothing to "conflict," so they're simple inserts. The client-generated UUID `id` is what makes retries from a flaky satellite link idempotent (re-sending the same row twice just no-ops on the second insert).
- **IDs are UUIDs generated on the device**, not server auto-increment. This is the one decision the whole offline-first design leans on — without it, two personnel scanning cargo offline at the same time would collide the moment they both sync.
- **SOS bypasses the 10-minute batch window.** Schema-wise it's a normal event table (`sos_incidents`), but rows are tagged `priority = 'immediate'` in the outbox/`outbound_sync_events` tables so the sync engine flushes them the instant any connectivity appears, instead of waiting for the timer.

## What lives where (and why)

| Concern | Phone | Maitri server | Central (India) |
|---|---|---|---|
| Cargo & inventory | create/scan (local, unsynced until online) | authoritative for Maitri, live | full replica, all stations |
| Resource usage (fuel/power/equipment) | log entries | authoritative | full replica |
| Field updates / location / SOS | source of truth (written first) | ingested, forwarded | full replica, all stations |
| Expedition planning | read-only cache | read-only cache | **authored here** |
| Risk prediction / AI recommendation / flight readiness | — | — | **generated here only** (needs full cross-station data + models) |
| RBAC / admin users | — | — | **here only** |
| Notifications (SMS/WhatsApp/email dispatch) | — | — | **here only** |
| Digital twin / dashboard snapshot | — | — | **here only** (`station_snapshots`) |

The reasoning: anything that needs the *whole* picture (AI risk scoring, cross-station dashboards, RBAC, expedition authorship) can only live centrally — a field station literally doesn't have the data to compute it. Everything else is created as close to the point of action as possible (phone) so it never blocks on connectivity.

## Location pings are batched, not synced 1:1

GPS readings are high-frequency, so none of the three schemas store or sync one row per ping:

- **Phone**: raw readings land in `location_ping_buffer` (scratch space, never synced). A background rollup — every 2-5 min, or every ~50 points, whichever comes first — packs whatever's in the buffer into a single `location_tracks_local` row (`points_json` array), clears the buffer, and it's *that* row that gets an `outbox_queue` entry.
- **Maitri server / Central server**: both drop the old per-ping `location_updates` table in favor of `location_tracks`, storing the same JSON point array (`JSONB` on Postgres) plus `track_started_at` / `track_ended_at` / `point_count`. The batch `id` generated on the phone is reused unchanged all the way to central — same idempotency guarantee as every other synced table.

Net effect: a busy field day produces a handful of track rows per person instead of hundreds of individual location rows, without losing per-point resolution — it's just nested inside `points` rather than one row per point.
