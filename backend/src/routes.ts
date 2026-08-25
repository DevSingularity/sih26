import { Router } from "express";
import type { RequestHandler } from "express";
import type { StationId } from "./types.js";
import { stations } from "./state.js";
import { pushAlert } from "./simulator.js";

function isStationId(value: unknown): value is StationId {
  return typeof value === "string" && value in stations;
}

export function createRouter(broadcast: () => void): Router {
  const router = Router();

  const sosHandler: RequestHandler = (req, res) => {
    const station = req.body?.station;
    if (!isStationId(station)) {
      res.status(400).json({ error: `unknown station, expected one of ${Object.keys(stations).join(", ")}` });
      return;
    }
    pushAlert({
      id: crypto.randomUUID(),
      severity: "critical",
      sos: true,
      message: `SOS triggered at ${stations[station].name} — priority channel`,
      timestamp: new Date().toISOString(),
    });
    broadcast();
    res.json({ ok: true });
  };

  const syncHandler: RequestHandler = (req, res) => {
    const queuedAt = req.body?.queued_at;
    const action = req.body?.action;
    if (typeof queuedAt !== "string" || queuedAt.length === 0 || typeof action !== "string" || action.length === 0) {
      res.status(400).json({ error: "queued_at and action must be non-empty strings" });
      return;
    }
    res.json({ synced_at: new Date().toISOString() });
  };

  const healthHandler: RequestHandler = (_req, res) => {
    res.json({ ok: true, uptime_s: Math.floor(process.uptime()) });
  };

  router.post("/sos", sosHandler);
  router.post("/sync", syncHandler);
  router.get("/health", healthHandler);

  return router;
}
