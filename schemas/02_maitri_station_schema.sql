-- =====================================================================
-- PolarOps — MAITRI STATION SERVER SCHEMA (Antarctic side)
-- Engine target : PostgreSQL 15+ (same engine as central, for schema
--                 parity — makes the upstream sync a straight row copy
--                 rather than a translation layer)
-- Scope         : SINGLE STATION ONLY (this instance = Maitri). If
--                 Bharati gets its own deployment later, it runs the
--                 same schema file with its own station_code baked
--                 into station_info.
--
-- ROLE IN THE PIPELINE:
--   Phones (Flutter/SQLite outbox) --sync--> THIS SERVER --produces--> Kafka
--                                                                          |
--                                                          10-min consumer batch
--                                                                          v
--                                                              Central India server
--
-- This server is the *local source of truth* for Maitri's live
-- operational state (what's the fuel level right now, what cargo just
-- got scanned, where is everyone) — even when the satellite link to
-- India is down for hours. It does NOT do AI/risk scoring, RBAC admin,
-- or expedition planning — those are India-HQ-only concerns and are
-- read-only/absent here.
--
-- Every row keeps the same LWW columns as the central schema
-- (client_updated_at / origin_device_id / sync_version) so a row can
-- be pushed upstream byte-for-byte without transformation.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- SECTION A — LOCAL CONFIG
-- ---------------------------------------------------------------------

-- Singleton table: exactly one row describing this station instance.
CREATE TABLE station_info (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_code    TEXT NOT NULL,           -- 'MAITRI'
    station_name    TEXT NOT NULL,
    central_station_id UUID NOT NULL,        -- the stations.id row for Maitri on the central server
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    timezone        TEXT
);

-- Local cache of personnel assigned to / currently at this station.
-- Written by the (rare) admin sync-down from India, read by the app
-- for offline login/lookup. Central `personnel` is authoritative;
-- this is a read-mostly mirror.
CREATE TABLE personnel_cache (
    id                  UUID PRIMARY KEY,     -- same id as central personnel.id
    employee_code       TEXT NOT NULL,
    full_name           TEXT NOT NULL,
    role                TEXT NOT NULL,
    designation         TEXT,
    phone               TEXT,
    status              TEXT NOT NULL DEFAULT 'active',
    last_synced_from_hq TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personnel_id    UUID NOT NULL REFERENCES personnel_cache(id),
    platform        TEXT CHECK (platform IN ('android','ios')),
    app_version     TEXT,
    last_seen_at    TIMESTAMPTZ,
    last_sync_at    TIMESTAMPTZ
);

-- Read-only cache of the active expedition plan for this station,
-- pulled down from India so field ops can reference it offline.
CREATE TABLE expedition_cache (
    id                  UUID PRIMARY KEY,     -- matches central expeditions.id
    name                TEXT NOT NULL,
    start_date          DATE,
    end_date            DATE,
    status              TEXT,
    resource_plan       JSONB,
    last_synced_from_hq TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- SECTION B — CARGO & INVENTORY (authoritative here, replicated up)
-- ---------------------------------------------------------------------

CREATE TABLE cargo_shipments (
    id                  UUID PRIMARY KEY,     -- client-generated, matches central table
    shipment_code       TEXT UNIQUE NOT NULL,
    origin               TEXT,
    mode                TEXT CHECK (mode IN ('ship','flight','land')),
    status              TEXT NOT NULL DEFAULT 'in_transit' CHECK (status IN ('in_transit','received','dispatched','delayed')),
    eta                 TIMESTAMPTZ,
    actual_arrival        TIMESTAMPTZ,
    carrier_ref          TEXT,
    origin_device_id    UUID,
    client_updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    sync_version        BIGINT NOT NULL DEFAULT 1,
    is_deleted          BOOLEAN NOT NULL DEFAULT false,
    pushed_to_kafka_at  TIMESTAMPTZ            -- null = still pending upstream sync
);

CREATE TABLE cargo_items (
    id                  UUID PRIMARY KEY,
    shipment_id         UUID REFERENCES cargo_shipments(id),
    item_name           TEXT NOT NULL,
    category            TEXT,
    quantity            NUMERIC NOT NULL DEFAULT 0,
    unit                TEXT,
    weight_kg           NUMERIC,
    barcode             TEXT,
    status              TEXT NOT NULL DEFAULT 'scanned' CHECK (status IN ('scanned','uploaded','verified','confirmed','stored')),
    handled_by          UUID REFERENCES personnel_cache(id),
    scanned_at          TIMESTAMPTZ,
    verified_at         TIMESTAMPTZ,
    confirmed_at        TIMESTAMPTZ,
    origin_device_id    UUID,
    client_updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    sync_version        BIGINT NOT NULL DEFAULT 1,
    is_deleted          BOOLEAN NOT NULL DEFAULT false,
    pushed_to_kafka_at  TIMESTAMPTZ
);

CREATE TABLE inventory_stock (
    id                  UUID PRIMARY KEY,
    item_category       TEXT NOT NULL,
    item_name           TEXT NOT NULL,
    quantity_on_hand    NUMERIC NOT NULL DEFAULT 0,
    unit                TEXT,
    reorder_threshold   NUMERIC,
    last_counted_at     TIMESTAMPTZ,
    origin_device_id    UUID,
    client_updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    sync_version        BIGINT NOT NULL DEFAULT 1,
    is_deleted          BOOLEAN NOT NULL DEFAULT false,
    pushed_to_kafka_at  TIMESTAMPTZ,
    UNIQUE (item_category, item_name)
);

CREATE TABLE inventory_transactions (
    id                  UUID PRIMARY KEY,
    inventory_id        UUID REFERENCES inventory_stock(id),
    change_qty          NUMERIC NOT NULL,
    txn_type            TEXT NOT NULL CHECK (txn_type IN ('receive','consume','adjust','transfer')),
    reference_table     TEXT,
    reference_id        UUID,
    performed_by        UUID REFERENCES personnel_cache(id),
    occurred_at         TIMESTAMPTZ NOT NULL,
    origin_device_id    UUID,
    server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    pushed_to_kafka_at  TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- SECTION C — RESOURCE MANAGEMENT
-- ---------------------------------------------------------------------

CREATE TABLE resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type   TEXT NOT NULL CHECK (resource_type IN ('fuel','power','equipment')),
    name            TEXT NOT NULL,
    capacity        NUMERIC,
    unit            TEXT,
    status          TEXT NOT NULL DEFAULT 'operational' CHECK (status IN ('operational','maintenance','offline'))
);

CREATE TABLE resource_usage_logs (
    id                  UUID PRIMARY KEY,
    resource_id         UUID REFERENCES resources(id),
    recorded_by         UUID REFERENCES personnel_cache(id),
    usage_type          TEXT NOT NULL CHECK (usage_type IN ('fuel','power','equipment')),
    quantity            NUMERIC NOT NULL,
    unit                TEXT,
    notes               TEXT,
    occurred_at         TIMESTAMPTZ NOT NULL,
    origin_device_id    UUID,
    server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    pushed_to_kafka_at  TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- SECTION D — FIELD OPERATIONS (ingested straight from phone outboxes)
-- ---------------------------------------------------------------------

CREATE TABLE field_updates (
    id                  UUID PRIMARY KEY,
    personnel_id        UUID NOT NULL REFERENCES personnel_cache(id),
    update_type         TEXT NOT NULL CHECK (update_type IN ('daily_activity','site_condition','note')),
    content              TEXT NOT NULL,
    attachments          JSONB,
    occurred_at         TIMESTAMPTZ NOT NULL,
    origin_device_id    UUID,
    server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    pushed_to_kafka_at  TIMESTAMPTZ
);

-- Batched, not per-ping — matches the phone's location_tracks table
-- (one row per buffered batch, not per GPS reading). `points` is a
-- JSON array of {lat, lng, accuracy_m, recorded_at}.
CREATE TABLE location_tracks (
    id                  UUID PRIMARY KEY,               -- same batch id the phone generated
    personnel_id         UUID NOT NULL REFERENCES personnel_cache(id),
    points                 JSONB NOT NULL,
    point_count             INT NOT NULL,
    track_started_at         TIMESTAMPTZ NOT NULL,
    track_ended_at            TIMESTAMPTZ NOT NULL,
    origin_device_id          UUID,
    server_received_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    pushed_to_kafka_at        TIMESTAMPTZ
);

-- SOS is the one event type that should NOT wait for the 10-min batch:
-- the sync engine watches this table (or a dedicated Kafka topic keyed
-- off it) and flushes immediately on insert, independent of the
-- regular timer. Schema-wise it's identical to a normal synced event;
-- the priority is a sync-engine behavior, not a schema difference.
CREATE TABLE sos_incidents (
    id                  UUID PRIMARY KEY,
    personnel_id         UUID NOT NULL REFERENCES personnel_cache(id),
    incident_type         TEXT NOT NULL CHECK (incident_type IN ('medical','equipment','environmental','other')),
    description             TEXT,
    severity                TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    latitude                DOUBLE PRECISION,
    longitude                DOUBLE PRECISION,
    status                    TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported','acknowledged','in_progress','resolved')),
    reported_at               TIMESTAMPTZ NOT NULL,
    acknowledged_at            TIMESTAMPTZ,
    resolved_at                 TIMESTAMPTZ,
    origin_device_id             UUID,
    server_received_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    pushed_to_kafka_at            TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- SECTION E — LOCAL ALERTS (rule-based only; AI risk scoring is
-- central-only — this station can raise simple threshold breaches
-- immediately for on-the-ground visibility, without waiting for India)
-- ---------------------------------------------------------------------

CREATE TABLE local_threshold_alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric          TEXT NOT NULL,             -- 'fuel_level','power_reserve', ...
    current_value   NUMERIC NOT NULL,
    threshold_value NUMERIC NOT NULL,
    severity        TEXT NOT NULL CHECK (severity IN ('warning','critical')),
    raised_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    pushed_to_kafka_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- SECTION F — OUTBOX / UPSTREAM SYNC INFRASTRUCTURE
-- (transactional outbox pattern: any insert/update into a syncable
-- table above also writes a row here in the same DB transaction, so
-- the Kafka producer never has to guess what changed.)
-- ---------------------------------------------------------------------

CREATE TABLE outbound_sync_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_table        TEXT NOT NULL,
    entity_id           UUID NOT NULL,
    operation           TEXT NOT NULL CHECK (operation IN ('insert','update','delete')),
    payload              JSONB NOT NULL,        -- full row snapshot at write time
    priority              TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','immediate')), -- 'immediate' = SOS
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    kafka_topic             TEXT NOT NULL DEFAULT 'maitri.station.events',
    kafka_produced_at        TIMESTAMPTZ,        -- null = not yet produced to Kafka
    kafka_offset              BIGINT
);

CREATE INDEX idx_outbound_pending ON outbound_sync_events(created_at) WHERE kafka_produced_at IS NULL;

-- Records inbound syncs FROM phones, so a phone's retried outbox
-- batch can be deduplicated (idempotency key = device_id + batch_id).
CREATE TABLE inbound_phone_batches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id             UUID NOT NULL REFERENCES devices(id),
    batch_id               UUID NOT NULL,        -- client-generated, unique per outbox flush
    record_count            INT NOT NULL,
    received_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    status                    TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','partial','failed')),
    UNIQUE (device_id, batch_id)
);

CREATE INDEX idx_cargo_items_status ON cargo_items(status);
CREATE INDEX idx_location_tracks_personnel_time ON location_tracks(personnel_id, track_started_at DESC);
CREATE INDEX idx_sos_open ON sos_incidents(status) WHERE status <> 'resolved';
