# personnel-app

Offline-first Flutter app carried by field personnel at Maitri.
Every write lands in local SQLite (via Drift) first; a background sync
engine drains the outbox to the station server whenever connectivity
allows.

- `lib/data/local/` — Drift schema, mirrors
  `/schemas/03_mobile_app_schema.sql` table-for-table.
- `lib/features/` — one folder per feature screen (field updates,
  cargo handling, resource usage, location tracking, SOS, sync status).
- `lib/services/` — sync engine, location-buffer rollup job,
  connectivity service.

Full build spec: [`/docs/03_personnel_app_build_prompt.md`](../docs/03_personnel_app_build_prompt.md).
Data model reference: [`/schemas/`](../schemas/).

Setting up a clone or a new machine? See [`SETUP.md`](./SETUP.md) —
covers generating the missing platform folders, required permissions,
and Drift codegen.
