-- Additive-only migration: tracks sync-down pull attempts from the central server.
-- This is NOT part of the 3-tier sync data model — it's an implementation detail
-- of the station server's admin sync-down feature. Stores "last successful pull"
-- timestamp so subsequent pulls only fetch new/changed data.
-- Schema is frozen; this migration is additive-only and does not modify
-- any table from 02_maitri_station_schema.sql.

CREATE TABLE IF NOT EXISTS sync_down_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    since_param     TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    status          TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    records_pulled  INT,
    error_message   TEXT
);
