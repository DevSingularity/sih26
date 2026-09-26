-- =====================================================================
-- PolarOps — PERSONNEL MOBILE APP SCHEMA (Flutter, local SQLite)
-- Engine target : SQLite (maps 1:1 to Drift Table classes — each
--                 CREATE TABLE below is one Drift @DataClassName)
-- Role          : Fully offline-first. Every user action is written
--                 here FIRST (source of truth on-device), queued in
--                 outbox_queue, then pushed to the Maitri station
--                 server whenever connectivity_log shows a link.
--                 Nothing the app does should ever block on network.
--
-- ID STRATEGY: every record gets a UUID v4 generated ON THE DEVICE at
-- creation time (uuid package in Dart). This id is reused unchanged
-- all the way up to the central server — it's how the whole pipeline
-- avoids collisions between rows created offline by different phones.
--
-- SQLite has no native UUID/JSONB/TIMESTAMPTZ types — UUIDs and
-- timestamps are stored as TEXT (ISO-8601), booleans as INTEGER 0/1,
-- and structured blobs as TEXT (JSON-encoded), which is exactly how
-- Drift represents them too.
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- SECTION A — LOCAL IDENTITY & CACHED REFERENCE DATA
-- ---------------------------------------------------------------------

-- Single-row table: the logged-in user's own profile, provisioned at
-- setup so login works even with zero connectivity thereafter.
CREATE TABLE self_profile (
    id              TEXT PRIMARY KEY,      -- personnel.id from central server
    employee_code   TEXT NOT NULL,
    full_name       TEXT NOT NULL,
    role            TEXT NOT NULL,
    designation     TEXT,
    station_id      TEXT NOT NULL,         -- 'MAITRI'
    auth_token_hash TEXT,                  -- cached credential for offline login
    device_id       TEXT NOT NULL          -- this device's UUID, registered with Maitri server
);

-- Read-only cache of teammates at the station, refreshed opportunistically
-- when online. Lets the app show "who's on site" and assign/reference
-- other personnel while offline.
CREATE TABLE personnel_cache (
    id              TEXT PRIMARY KEY,
    full_name       TEXT NOT NULL,
    role            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active',
    cached_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Read-only cache of the active expedition/resource plan, for
-- reference while filling out forms offline.
CREATE TABLE expedition_cache (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    status          TEXT,
    resource_plan_json TEXT,               -- JSON-encoded
    cached_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- SECTION B — CARGO HANDLING (scan / upload / verify / confirm)
-- ---------------------------------------------------------------------

CREATE TABLE cargo_items_local (
    id              TEXT PRIMARY KEY,      -- client-generated UUID
    shipment_id     TEXT,
    item_name       TEXT NOT NULL,
    category        TEXT,
    quantity        REAL NOT NULL DEFAULT 0,
    unit            TEXT,
    weight_kg       REAL,
    barcode         TEXT,
    status          TEXT NOT NULL DEFAULT 'scanned' CHECK (status IN ('scanned','uploaded','verified','confirmed')),
    photo_path      TEXT,                   -- local file path; uploaded when online
    scanned_at      TEXT,
    verified_at     TEXT,
    confirmed_at    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    is_synced       INTEGER NOT NULL DEFAULT 0   -- 0 = pending in outbox, 1 = confirmed synced
);

-- ---------------------------------------------------------------------
-- SECTION C — RESOURCE USAGE (fuel / power / equipment)
-- ---------------------------------------------------------------------

CREATE TABLE resource_usage_local (
    id              TEXT PRIMARY KEY,
    resource_name   TEXT NOT NULL,
    usage_type      TEXT NOT NULL CHECK (usage_type IN ('fuel','power','equipment')),
    quantity        REAL NOT NULL,
    unit            TEXT,
    notes           TEXT,
    occurred_at     TEXT NOT NULL DEFAULT (datetime('now')),
    is_synced       INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- SECTION D — FIELD UPDATES (daily activity / site conditions / notes)
-- ---------------------------------------------------------------------

CREATE TABLE field_updates_local (
    id              TEXT PRIMARY KEY,
    update_type     TEXT NOT NULL CHECK (update_type IN ('daily_activity','site_condition','note')),
    content         TEXT NOT NULL,
    attachment_paths TEXT,                 -- JSON array of local file paths
    occurred_at     TEXT NOT NULL DEFAULT (datetime('now')),
    is_synced       INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- SECTION E — LOCATION UPDATES (GPS), batched
--
-- Two tables, two lifecycles:
--   1. location_ping_buffer  — every raw GPS reading lands here the
--      instant it's captured. Never synced, never enqueued directly —
--      it's scratch space for the local map view and for the rollup
--      job below.
--   2. location_tracks_local — a background timer (e.g. every 2-5 min,
--      or every ~50 points, whichever comes first) rolls up whatever
--      is sitting in the buffer into ONE row here as a JSON point
--      array, then deletes those buffer rows. This track row is what
--      actually gets an outbox_queue entry — so a busy day produces a
--      handful of outbox rows instead of hundreds of raw pings.
-- ---------------------------------------------------------------------

CREATE TABLE location_ping_buffer (
    id              TEXT PRIMARY KEY,
    latitude        REAL NOT NULL,
    longitude       REAL NOT NULL,
    accuracy_m      REAL,
    recorded_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE location_tracks_local (
    id              TEXT PRIMARY KEY,          -- batch id; reused unchanged all the way to central
    points_json     TEXT NOT NULL,             -- JSON array of {lat,lng,accuracy_m,recorded_at}
    point_count     INTEGER NOT NULL,
    track_started_at TEXT NOT NULL,            -- recorded_at of first point in the batch
    track_ended_at  TEXT NOT NULL,             -- recorded_at of last point in the batch
    is_synced       INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- SECTION F — SOS INCIDENTS
-- Written locally first like everything else, but flagged 'immediate'
-- in the outbox so the sync manager tries to send it the moment ANY
-- connectivity (even a thin satellite ping) is detected, instead of
-- waiting for a normal batch flush.
-- ---------------------------------------------------------------------

CREATE TABLE sos_incidents_local (
    id              TEXT PRIMARY KEY,
    incident_type   TEXT NOT NULL CHECK (incident_type IN ('medical','equipment','environmental','other')),
    description     TEXT,
    severity        TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    latitude        REAL,
    longitude       REAL,
    status          TEXT NOT NULL DEFAULT 'reported',
    reported_at     TEXT NOT NULL DEFAULT (datetime('now')),
    is_synced       INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- SECTION G — OUTBOX / SYNC ENGINE (the core offline-first mechanism)
-- ---------------------------------------------------------------------

-- Every write to any *_local table above also inserts one row here in
-- the same transaction. The sync manager only ever reads THIS table —
-- it doesn't need to know the shape of every feature table.
CREATE TABLE outbox_queue (
    id              TEXT PRIMARY KEY,      -- outbox row id (its own UUID)
    entity_table    TEXT NOT NULL,          -- 'cargo_items_local', 'sos_incidents_local', ...
    entity_id       TEXT NOT NULL,          -- the id of the row in that table
    operation       TEXT NOT NULL CHECK (operation IN ('insert','update')),
    payload_json    TEXT NOT NULL,          -- full row snapshot, JSON-encoded
    priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','immediate')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    attempt_count   INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TEXT,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed'))
);

CREATE INDEX idx_outbox_pending ON outbox_queue(status, priority, created_at);

-- One row per flush attempt to the Maitri server, batching multiple
-- outbox_queue rows together (matches inbound_phone_batches on the
-- station server, keyed by this batch_id, for idempotent retries).
CREATE TABLE sync_batches_local (
    id              TEXT PRIMARY KEY,      -- batch_id sent to server
    record_count    INTEGER NOT NULL,
    started_at      TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at    TEXT,
    status          TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','success','failed'))
);

-- Simple connectivity heartbeat log the sync manager consults before
-- attempting a flush (satellite/network intermittent per the design).
CREATE TABLE connectivity_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    checked_at      TEXT NOT NULL DEFAULT (datetime('now')),
    is_online       INTEGER NOT NULL,       -- 0/1
    link_type       TEXT                    -- 'satellite','wifi','none'
);
