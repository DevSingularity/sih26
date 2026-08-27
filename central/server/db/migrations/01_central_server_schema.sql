-- =====================================================================
-- PolarOps — CENTRAL SERVER SCHEMA (India HQ / NCPOR)
-- Engine target : PostgreSQL 15+ (+ PostGIS optional, see note at bottom)
-- Role          : Single source of truth. Receives batched syncs from
--                 every Antarctic station server (Maitri, Bharati, ...)
--                 every ~10 min via a Kafka consumer. Owns all
--                 admin-only concerns: expedition planning, AI/risk
--                 intelligence, RBAC, notifications, dashboards.
--
-- SYNC / CONFLICT STRATEGY: Last-Write-Wins (LWW) on client_updated_at.
--   Every syncable row carries:
--     id                 UUID, generated CLIENT-SIDE (phone or station
--                        server) so offline-created rows never collide.
--     origin_station_id  which station the row/event originated at.
--     origin_device_id   which phone/device produced it (nullable for
--                        station- or HQ-generated rows).
--     client_updated_at  the timestamp on the device/station at the
--                        moment of the write — this is what LWW
--                        compares.
--     server_received_at when the central server actually ingested it
--                        (for audit / latency measurement only, never
--                        used to resolve conflicts).
--     sync_version        monotonically incremented on every accepted
--                        write to a row; not used to resolve LWW, but
--                        kept as a defense-in-depth guard so a stale
--                        batch can be detected/logged even if a clock
--                        is wrong (see sync_conflicts below).
--     is_deleted          soft-delete tombstone (never hard-delete
--                        synced rows).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ---------------------------------------------------------------------
-- SECTION A — ORG / REFERENCE DATA
-- ---------------------------------------------------------------------

CREATE TABLE stations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT UNIQUE NOT NULL,               -- 'MAITRI', 'BHARATI', 'HQ'
    name            TEXT NOT NULL,
    station_type    TEXT NOT NULL CHECK (station_type IN ('command_center','field_station')),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    timezone        TEXT,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','seasonal_closed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE personnel (
    id                  UUID PRIMARY KEY,               -- client-generated on first provisioning
    employee_code       TEXT UNIQUE NOT NULL,
    full_name           TEXT NOT NULL,
    role                TEXT NOT NULL CHECK (role IN ('field_personnel','cargo_team','transport_crew','expedition_planner','admin','ncpor_command')),
    designation         TEXT,
    home_station_id     UUID REFERENCES stations(id),
    phone               TEXT,
    email                TEXT,
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','deployed','on_leave')),
    origin_station_id   UUID REFERENCES stations(id),
    origin_device_id    UUID,
    client_updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    sync_version        BIGINT NOT NULL DEFAULT 1,
    is_deleted          BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE devices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personnel_id        UUID NOT NULL REFERENCES personnel(id),
    platform            TEXT CHECK (platform IN ('android','ios')),
    app_version         TEXT,
    push_token          TEXT,
    last_seen_at        TIMESTAMPTZ,
    last_sync_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personnel_id    UUID REFERENCES personnel(id),      -- nullable: pure NCPOR web users
    username        TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('super_admin','ops_manager','logistics_officer','viewer')),
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- SECTION B — EXPEDITION PLANNING (admin-only, central-authored)
-- ---------------------------------------------------------------------

CREATE TABLE expeditions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    station_id      UUID NOT NULL REFERENCES stations(id),
    start_date      DATE NOT NULL,
    end_date        DATE,
    status          TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','completed','cancelled')),
    resource_plan   JSONB,                               -- planned fuel/power/equipment allocation
    created_by      UUID REFERENCES admin_users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expedition_legs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expedition_id       UUID NOT NULL REFERENCES expeditions(id),
    sequence            INT NOT NULL,
    mode                TEXT CHECK (mode IN ('ship','flight','land')),
    origin               TEXT,
    destination          TEXT,
    planned_departure   TIMESTAMPTZ,
    planned_arrival      TIMESTAMPTZ,
    actual_departure     TIMESTAMPTZ,
    actual_arrival        TIMESTAMPTZ,
    status                TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_transit','arrived','delayed','cancelled'))
);

-- ---------------------------------------------------------------------
-- SECTION C — CARGO & INVENTORY (originates at station, replicated up)
-- ---------------------------------------------------------------------

CREATE TABLE cargo_shipments (
    id                  UUID PRIMARY KEY,
    shipment_code       TEXT UNIQUE NOT NULL,
    origin               TEXT,
    destination_station_id UUID REFERENCES stations(id),
    mode                TEXT CHECK (mode IN ('ship','flight','land')),
    status              TEXT NOT NULL DEFAULT 'in_transit' CHECK (status IN ('in_transit','received','dispatched','delayed')),
    eta                 TIMESTAMPTZ,
    actual_arrival        TIMESTAMPTZ,
    carrier_ref          TEXT,
    origin_station_id   UUID REFERENCES stations(id),
    origin_device_id    UUID,
    client_updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    sync_version        BIGINT NOT NULL DEFAULT 1,
    is_deleted          BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cargo_items (
    id                  UUID PRIMARY KEY,
    shipment_id         UUID REFERENCES cargo_shipments(id),
    station_id          UUID NOT NULL REFERENCES stations(id),
    item_name           TEXT NOT NULL,
    category            TEXT,
    quantity            NUMERIC NOT NULL DEFAULT 0,
    unit                TEXT,
    weight_kg           NUMERIC,
    barcode             TEXT,
    status              TEXT NOT NULL DEFAULT 'scanned' CHECK (status IN ('scanned','uploaded','verified','confirmed','stored')),
    handled_by          UUID REFERENCES personnel(id),
    scanned_at          TIMESTAMPTZ,
    verified_at         TIMESTAMPTZ,
    confirmed_at        TIMESTAMPTZ,
    origin_station_id   UUID REFERENCES stations(id),
    origin_device_id    UUID,
    client_updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    sync_version        BIGINT NOT NULL DEFAULT 1,
    is_deleted          BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_stock (
    id                  UUID PRIMARY KEY,
    station_id          UUID NOT NULL REFERENCES stations(id),
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
    UNIQUE (station_id, item_category, item_name)
);

CREATE TABLE inventory_transactions (
    id                  UUID PRIMARY KEY,
    station_id          UUID NOT NULL REFERENCES stations(id),
    inventory_id        UUID REFERENCES inventory_stock(id),
    change_qty          NUMERIC NOT NULL,               -- signed: +receive, -consume
    txn_type            TEXT NOT NULL CHECK (txn_type IN ('receive','consume','adjust','transfer')),
    reference_table     TEXT,                            -- e.g. 'cargo_items', 'resource_usage_logs'
    reference_id        UUID,
    performed_by        UUID REFERENCES personnel(id),
    occurred_at         TIMESTAMPTZ NOT NULL,             -- client clock, event is append-only (no LWW needed)
    origin_device_id    UUID,
    server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- SECTION D — RESOURCE MANAGEMENT (fuel / power / equipment)
-- ---------------------------------------------------------------------

CREATE TABLE resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id      UUID NOT NULL REFERENCES stations(id),
    resource_type   TEXT NOT NULL CHECK (resource_type IN ('fuel','power','equipment')),
    name            TEXT NOT NULL,
    capacity        NUMERIC,
    unit            TEXT,
    status          TEXT NOT NULL DEFAULT 'operational' CHECK (status IN ('operational','maintenance','offline'))
);

CREATE TABLE resource_usage_logs (
    id                  UUID PRIMARY KEY,               -- client-generated (append-only event)
    resource_id         UUID REFERENCES resources(id),
    station_id          UUID NOT NULL REFERENCES stations(id),
    recorded_by         UUID REFERENCES personnel(id),
    usage_type          TEXT NOT NULL CHECK (usage_type IN ('fuel','power','equipment')),
    quantity            NUMERIC NOT NULL,
    unit                TEXT,
    notes               TEXT,
    occurred_at         TIMESTAMPTZ NOT NULL,             -- client clock
    origin_device_id    UUID,
    server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- SECTION E — FIELD OPERATIONS (append-only events from personnel phones)
-- Idempotency: id is client-generated UUID, so re-sent (retried) rows
-- from the phone's outbox are simply ignored on conflict.
-- ---------------------------------------------------------------------

CREATE TABLE field_updates (
    id                  UUID PRIMARY KEY,
    personnel_id        UUID NOT NULL REFERENCES personnel(id),
    station_id          UUID NOT NULL REFERENCES stations(id),
    update_type         TEXT NOT NULL CHECK (update_type IN ('daily_activity','site_condition','note')),
    content              TEXT NOT NULL,
    attachments          JSONB,                           -- array of file refs uploaded once online
    occurred_at         TIMESTAMPTZ NOT NULL,
    origin_device_id    UUID,
    server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Batched, not per-ping: the phone buffers GPS readings locally and
-- flushes one row per batch window (e.g. every few minutes), so this
-- table holds far fewer rows than raw ping volume would produce.
-- `points` is a JSON array of {lat, lng, accuracy_m, recorded_at}.
CREATE TABLE location_tracks (
    id                  UUID PRIMARY KEY,               -- client-generated (one id per batch)
    personnel_id        UUID NOT NULL REFERENCES personnel(id),
    station_id          UUID NOT NULL REFERENCES stations(id),
    points               JSONB NOT NULL,                 -- [{ "lat":.., "lng":.., "accuracy_m":.., "recorded_at":".." }, ...]
    point_count           INT NOT NULL,
    track_started_at       TIMESTAMPTZ NOT NULL,           -- recorded_at of first point in the batch
    track_ended_at          TIMESTAMPTZ NOT NULL,           -- recorded_at of last point in the batch
    origin_device_id        UUID,
    server_received_at      TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (track_started_at);   -- still high-volume; partition monthly in practice

CREATE TABLE sos_incidents (
    id                  UUID PRIMARY KEY,
    personnel_id         UUID NOT NULL REFERENCES personnel(id),
    station_id           UUID NOT NULL REFERENCES stations(id),
    incident_type        TEXT NOT NULL CHECK (incident_type IN ('medical','equipment','environmental','other')),
    description           TEXT,
    severity              TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    latitude              DOUBLE PRECISION,
    longitude             DOUBLE PRECISION,
    status                TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported','acknowledged','in_progress','resolved')),
    reported_at           TIMESTAMPTZ NOT NULL,
    acknowledged_at       TIMESTAMPTZ,
    resolved_at           TIMESTAMPTZ,
    origin_device_id      UUID,
    server_received_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sos_incident_updates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_incident_id      UUID NOT NULL REFERENCES sos_incidents(id),
    updated_by            UUID REFERENCES personnel(id),
    status                TEXT NOT NULL,
    note                  TEXT,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- SECTION F — RISK, ALERTS & AI INTELLIGENCE (central-generated only)
-- These are produced by the Decision Intelligence layer (rule engine +
-- ML) which runs centrally against synced station data — never
-- generated on the phone or the station server.
-- ---------------------------------------------------------------------

CREATE TABLE risk_thresholds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id      UUID NOT NULL REFERENCES stations(id),
    metric          TEXT NOT NULL,                        -- 'fuel_level','power_reserve','weather_severity', ...
    warning_value   NUMERIC,
    critical_value  NUMERIC,
    updated_by      UUID REFERENCES admin_users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE risk_predictions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id             UUID NOT NULL REFERENCES stations(id),
    predicted_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    risk_type                TEXT NOT NULL,
    risk_score                NUMERIC NOT NULL,             -- 0..1
    contributing_factors      JSONB,
    model_version              TEXT,
    recommendation             TEXT
);

CREATE TABLE flight_readiness_assessments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id           UUID NOT NULL REFERENCES stations(id),
    assessed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    readiness_score         NUMERIC NOT NULL,
    weather_snapshot        JSONB,
    resource_snapshot       JSONB,
    recommendation           TEXT,
    status                    TEXT CHECK (status IN ('go','no_go','caution'))
);

CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id      UUID NOT NULL REFERENCES stations(id),
    source_type     TEXT NOT NULL CHECK (source_type IN ('risk_prediction','threshold','sos','manual')),
    source_id       UUID,
    severity        TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
    title           TEXT NOT NULL,
    message         TEXT,
    status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

CREATE TABLE alert_notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id             UUID NOT NULL REFERENCES alerts(id),
    channel               TEXT NOT NULL CHECK (channel IN ('in_app','sms','whatsapp','email')),
    recipient_personnel_id UUID REFERENCES personnel(id),
    sent_at                TIMESTAMPTZ,
    delivery_status         TEXT CHECK (delivery_status IN ('queued','sent','delivered','failed'))
);

CREATE TABLE ai_recommendations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id           UUID NOT NULL REFERENCES stations(id),
    context_table         TEXT,                             -- e.g. 'sos_incidents', 'risk_predictions'
    context_id             UUID,
    recommendation_text    TEXT NOT NULL,
    confidence_score        NUMERIC,
    generated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    model_version             TEXT,
    accepted_by                UUID REFERENCES admin_users(id),
    accepted_at                 TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- SECTION G — DASHBOARD / DIGITAL TWIN (materialized read cache)
-- ---------------------------------------------------------------------

CREATE TABLE station_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id            UUID NOT NULL REFERENCES stations(id),
    snapshot_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    cargo_summary            JSONB,
    inventory_summary        JSONB,
    personnel_count           INT,
    resource_summary         JSONB,
    active_alerts_count      INT
);

-- ---------------------------------------------------------------------
-- SECTION H — SYNC & AUDIT INFRASTRUCTURE
-- ---------------------------------------------------------------------

CREATE TABLE sync_batches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_station_id    UUID NOT NULL REFERENCES stations(id),
    kafka_topic            TEXT NOT NULL,
    kafka_offset_start       BIGINT,
    kafka_offset_end        BIGINT,
    record_count             INT,
    batch_received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    status                     TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processed','partial','failed'))
);

-- Rows land here whenever an incoming client_updated_at loses an LWW
-- comparison against what's already stored, OR when sync_version
-- suggests the incoming batch is older than what was already applied
-- (clock-skew guard). Kept for audit — the "losing" write is logged,
-- never silently dropped.
CREATE TABLE sync_conflicts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_table          TEXT NOT NULL,
    entity_id              UUID NOT NULL,
    incoming_value          JSONB NOT NULL,
    existing_value          JSONB NOT NULL,
    resolution               TEXT NOT NULL CHECK (resolution IN ('incoming_wins','existing_wins')),
    resolved_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type      TEXT NOT NULL CHECK (actor_type IN ('personnel','admin','system')),
    actor_id        UUID,
    action          TEXT NOT NULL,
    entity_table    TEXT NOT NULL,
    entity_id       UUID,
    before_value    JSONB,
    after_value     JSONB,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- INDEXES (high-traffic lookups)
-- ---------------------------------------------------------------------
CREATE INDEX idx_cargo_items_station_status ON cargo_items(station_id, status);
CREATE INDEX idx_inventory_stock_station ON inventory_stock(station_id);
CREATE INDEX idx_location_tracks_personnel_time ON location_tracks(personnel_id, track_started_at DESC);
CREATE INDEX idx_sos_incidents_status ON sos_incidents(status) WHERE status <> 'resolved';
CREATE INDEX idx_alerts_open ON alerts(station_id, status) WHERE status = 'open';
CREATE INDEX idx_sync_batches_station ON sync_batches(source_station_id, batch_received_at DESC);

-- NOTE ON POSTGIS: if the "Operations Map" / route optimizer needs true
-- geospatial queries (nearest station, route distance, geofencing),
-- add a `geom geometry(Point,4326)` column to location_tracks (or to
-- individual points once unpacked), sos_incidents and stations, via
-- ST_SetSRID(ST_MakePoint(longitude, latitude), 4326), and index it
-- with a GIST index. Left out above to keep this file DB-agnostic
-- for anyone spinning it up without the PostGIS extension enabled.
