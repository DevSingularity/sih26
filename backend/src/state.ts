import type { Alert, Asset, Station, StationId } from "./types.js";

export const stations: Record<StationId, Station> = {
  maitri: { name: "Maitri", lat: -70.7658, lon: 11.7333 },
  bharati: { name: "Bharati", lat: -69.4076, lon: 76.1929 },
};

export const assets: Record<string, Asset> = {
  "maitri-fuel-1": { id: "maitri-fuel-1", station: "maitri", type: "fuel", value: 68, unit: "%", status: "ok" },
  "maitri-cargo-1": { id: "maitri-cargo-1", station: "maitri", type: "cargo", value: 12, unit: "crates", status: "ok" },
  "maitri-crew-1": { id: "maitri-crew-1", station: "maitri", type: "personnel", value: 23, unit: "on-site", status: "ok" },
  "bharati-fuel-1": { id: "bharati-fuel-1", station: "bharati", type: "fuel", value: 41, unit: "%", status: "ok" },
  "bharati-cargo-1": { id: "bharati-cargo-1", station: "bharati", type: "cargo", value: 8, unit: "crates", status: "ok" },
  "bharati-crew-1": { id: "bharati-crew-1", station: "bharati", type: "personnel", value: 19, unit: "on-site", status: "ok" },
};

export const alerts: Alert[] = [];
