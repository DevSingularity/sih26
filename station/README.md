# station-server

Maitri (Antarctic) side of PolarOps: single-station local database,
the phone ingestion endpoint, the transactional-outbox → Kafka
producer, and a local ops dashboard for the station commander.

- `backend/` — Express API + outbox pattern + Kafka producer. Schema:
  `backend/db/migrations/02_maitri_station_schema.sql`.
- `local-ui/` — Next.js local dashboard, talks to `backend/` only.

Full build spec: [`/docs/02_station_server_build_prompt.md`](../docs/02_station_server_build_prompt.md).
Data model reference: [`/schemas/`](../schemas/).
