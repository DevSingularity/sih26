import { Router } from "express";
import type { RequestHandler } from "express";
import {
  cargoItems,
  cargoMovementEvents,
  expeditions,
  inventorySnapshots,
  shipmentTracks,
} from "./state.js";

export function createExpeditionsRouter(): Router {
  const router = Router();

  const listHandler: RequestHandler = (_req, res) => {
    res.json(expeditions);
  };

  const detailHandler: RequestHandler = (req, res) => {
    const exp = expeditions.find((e) => e.id === req.params.id);
    if (!exp) { res.status(404).json({ error: "not_found" }); return; }
    const cargo = cargoItems.filter((c) => c.expeditionId === exp.id);
    const shipments = shipmentTracks.filter((s) => s.expeditionId === exp.id);
    res.json({ ...exp, cargo, shipments });
  };

  const createHandler: RequestHandler = (req, res) => {
    const { name, route, startDate, createdBy, personnelAssigned, cargoRequirementSummary } = req.body ?? {};
    if (!name || !route || !startDate) {
      res.status(400).json({ error: "name, route, startDate required" });
      return;
    }
    const exp = {
      id: `exp-${crypto.randomUUID().slice(0, 8)}`,
      name,
      route,
      startDate,
      status: "PLANNED" as const,
      createdBy: createdBy ?? "HQ Admin",
      personnelAssigned: personnelAssigned ?? [],
      cargoRequirementSummary: cargoRequirementSummary ?? "",
    };
    expeditions.push(exp);
    res.json(exp);
  };

  router.get("/", listHandler);
  router.get("/:id", detailHandler);
  router.post("/", createHandler);

  return router;
}

export function createCargoRouter(): Router {
  const router = Router();

  const listHandler: RequestHandler = (req, res) => {
    const expeditionId = req.query.expeditionId as string | undefined;
    let items = cargoItems;
    if (expeditionId) {
      items = items.filter((c) => c.expeditionId === expeditionId);
    }
    res.json(items);
  };

  const inventoryHandler: RequestHandler = (req, res) => {
    const station = req.query.station as string | undefined;
    let snaps = inventorySnapshots;
    if (station) {
      snaps = snaps.filter((s) => s.station === station);
    }
    res.json(snaps);
  };

  const moveHandler: RequestHandler = (req, res) => {
    const item = cargoItems.find((c) => c.id === req.params.id);
    if (!item) { res.status(404).json({ error: "not_found" }); return; }
    const { toLocation, recordedBy } = req.body ?? {};
    if (!toLocation) { res.status(400).json({ error: "toLocation required" }); return; }

    const event = {
      id: `evt-${crypto.randomUUID().slice(0, 8)}`,
      cargoItemId: item.id,
      fromLocation: item.currentLocation,
      toLocation,
      timestamp: new Date().toISOString(),
      recordedBy: recordedBy ?? "Admin",
    };
    cargoMovementEvents.push(event);

    item.currentLocation = toLocation as typeof item.currentLocation;
    if (toLocation === "maitri" || toLocation === "bharati") {
      item.custodyState = "INWARD";
    } else if (toLocation === "in-transit") {
      item.custodyState = "IN_TRANSIT";
    }

    res.json({ item, event });
  };

  const movementHandler: RequestHandler = (req, res) => {
    const events = cargoMovementEvents.filter((e) => e.cargoItemId === req.params.id);
    res.json(events);
  };

  router.get("/", listHandler);
  router.get("/inventory", inventoryHandler);
  router.post("/:id/move", moveHandler);
  router.get("/:id/movements", movementHandler);

  return router;
}

export function createTrackingRouter(): Router {
  const router = Router();

  const listHandler: RequestHandler = (req, res) => {
    const expeditionId = req.query.expeditionId as string | undefined;
    let tracks = shipmentTracks;
    if (expeditionId) {
      tracks = tracks.filter((s) => s.expeditionId === expeditionId);
    }
    res.json(tracks);
  };

  router.get("/", listHandler);

  return router;
}
