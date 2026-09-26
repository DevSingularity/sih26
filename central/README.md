# central-server

India HQ / NCPOR side of PolarOps: source-of-truth database, Kafka
consumer, admin REST API, and the Next.js admin dashboard.

- `backend/` — Express API + Kafka consumer + risk/alert jobs. Schema:
  `backend/db/migrations/01_central_server_schema.sql`.
- `admin-ui/` — Next.js PWA admin dashboard, talks to `backend/` only.

Full build spec: [`/docs/01_central_server_build_prompt.md`](../docs/01_central_server_build_prompt.md).
Data model reference: [`/schemas/`](../schemas/).
