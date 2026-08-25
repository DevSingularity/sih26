import { Router } from "express";
import type { RequestHandler } from "express";
import { wasteLogs } from "./state.js";

export function createWasteRouter(): Router {
  const router = Router();

  const listHandler: RequestHandler = (req, res) => {
    const station = req.query.station as string | undefined;
    let logs = wasteLogs;
    if (station) {
      logs = logs.filter((w) => w.station === station);
    }
    res.json(logs);
  };

  const createHandler: RequestHandler = (req, res) => {
    const { station, category, quantityKg, method } = req.body ?? {};
    if (!station || !category || !quantityKg || !method) {
      res.status(400).json({ error: "station, category, quantityKg, method required" });
      return;
    }
    const entry = {
      id: `waste-${crypto.randomUUID().slice(0, 8)}`,
      station,
      category,
      quantityKg,
      method,
      loggedAt: new Date().toISOString(),
    };
    wasteLogs.push(entry);
    res.json(entry);
  };

  router.get("/", listHandler);
  router.post("/", createHandler);

  return router;
}
