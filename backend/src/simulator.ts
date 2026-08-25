import type { Alert, StateUpdate } from "./types.js";
import { alerts, assets, stations } from "./state.js";
import { evaluateStatus } from "./risk-eval.js";

const TICK_MS = 3000;
const FUEL_ROTATION = ["maitri-fuel-1", "bharati-fuel-1"];
const OPENING_SCRIPT = [4, 4, 5, 6, 7, 8, 8, 9];
const MAX_ALERTS = 100;
const STATUS_RANK = { ok: 0, warn: 1, critical: 2 } as const;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pushAlert(alert: Alert): void {
  alerts.push(alert);
  if (alerts.length > MAX_ALERTS) {
    alerts.splice(0, alerts.length - MAX_ALERTS);
  }
}

function getStateUpdate(): StateUpdate {
  return { type: "state_update", assets, alerts };
}

function applyTransitions(): void {
  for (const asset of Object.values(assets)) {
    const next = evaluateStatus(asset);
    if (STATUS_RANK[next] > STATUS_RANK[asset.status]) {
      asset.status = next;
      const station = stations[asset.station];
      pushAlert({
        id: crypto.randomUUID(),
        severity: next,
        message: `${station.name} ${asset.type} at ${asset.value}${asset.unit === "%" ? "%" : ` ${asset.unit}`} — below threshold`,
        timestamp: new Date().toISOString(),
      });
    } else {
      asset.status = next;
    }
  }
}

function startSimulator(broadcast: () => void): void {
  let tick = 0;
  let fuelIdx = 0;
  let cargoIdx = 0;
  const cargoIds = Object.keys(assets).filter((id) => assets[id].type === "cargo");
  setInterval(() => {
    tick += 1;
    if (tick <= OPENING_SCRIPT.length) {
      const scripted = assets["maitri-fuel-1"];
      scripted.value = Math.max(0, scripted.value - OPENING_SCRIPT[tick - 1]);
    } else {
      for (const asset of Object.values(assets)) {
        if (asset.type === "fuel") {
          asset.value = Math.max(0, asset.value - randInt(2, 4));
        }
      }
      if (tick % 2 === 0) {
        const id = FUEL_ROTATION[fuelIdx % FUEL_ROTATION.length];
        fuelIdx += 1;
        const asset = assets[id];
        asset.value = Math.max(0, asset.value - randInt(4, 7));
      }
    }
    if (tick % 6 === 0) {
      const id = cargoIds[cargoIdx % cargoIds.length];
      cargoIdx += 1;
      const asset = assets[id];
      asset.value = Math.max(0, asset.value - 1);
    }
    applyTransitions();
    broadcast();
  }, TICK_MS);
}

export { startSimulator, pushAlert, getStateUpdate };
