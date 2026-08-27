-- Additive-only migration: local response cache for POST /api/sync/push idempotency.
-- This is NOT part of the 3-tier sync data model — it's an implementation detail
-- of the station server's ingestion endpoint. A phone retrying the same
-- (device_id, batch_id) gets the exact same response back without re-applying.
-- Schema is frozen; this migration is additive-only and does not modify
-- any table from 02_maitri_station_schema.sql.

CREATE TABLE IF NOT EXISTS sync_push_response_cache (
    device_id       UUID NOT NULL,
    batch_id        UUID NOT NULL,
    response_json   JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (device_id, batch_id)
);
