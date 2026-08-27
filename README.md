# PolarOps

SIH 2026 · PS ID 26062 · Team ARJUN — Integrated Polar Expedition
Logistics and Asset Management System.

Three independently-buildable applications, one per team member, tied
together by the sync pipeline documented in `/schemas/README.md`:

```
personnel-app (Flutter, offline-first)
        |  POST /api/sync/push
        v
station-server (Maitri, single-station)
        |  transactional outbox -> Kafka (maitri.station.events)
        v
central-server (India HQ)  <-- source of truth, admin UI, AI/risk layer
```

## Repo layout

```
polarops/
├── central-server/        # Teammate A — India HQ server + admin UI
│   ├── backend/            Express API + Kafka consumer + Postgres
│   └── admin-ui/            Next.js PWA dashboard
├── station-server/        # Teammate B — Maitri station server + local UI
│   ├── backend/             Express API + outbox + Kafka producer + Postgres
│   └── local-ui/             Next.js local ops dashboard
├── personnel-app/         # Teammate C — Flutter field-personnel app
│   └── lib/                  Drift (SQLite) local-first data layer + feature screens
├── schemas/                # Shared reference — DDL for all 3 tiers + sync design README
│   ├── 01_central_server_schema.sql
│   ├── 02_maitri_station_schema.sql
│   ├── 03_mobile_app_schema.sql
│   └── README.md
└── docs/                   # One detailed build prompt per application
    ├── 01_central_server_build_prompt.md
    ├── 02_station_server_build_prompt.md
    └── 03_personnel_app_build_prompt.md
```

## Where each person starts

| Teammate | Directory | Build spec |
|---|---|---|
| A | `central-server/` | `docs/01_central_server_build_prompt.md` |
| B | `station-server/` | `docs/02_station_server_build_prompt.md` |
| C | `personnel-app/` | `docs/03_personnel_app_build_prompt.md` |

Everyone should read `schemas/README.md` first — it explains the
Last-Write-Wins conflict model and the location-batching design that
all three applications depend on.

Each app is independently runnable/buildable — see the `README.md`
inside each directory for that app's own setup. `.env.example` files
in each backend show the config each service needs, including the
shared secrets used at the two integration boundaries (phone ↔
station, station ↔ central).
