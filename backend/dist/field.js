import { Router } from "express";
import { fieldUpdates, locationUpdates, sosEvents, } from "./state.js";
import { pushAlert } from "./simulator.js";
export function createFieldRouter() {
    const router = Router();
    const listUpdates = (req, res) => {
        const station = req.query.station;
        let updates = fieldUpdates;
        if (station)
            updates = updates.filter((u) => u.station === station);
        res.json(updates);
    };
    const submitUpdate = (req, res) => {
        const { station, activity, siteConditions, notes, operationId } = req.body ?? {};
        if (!station || !activity) {
            res.status(400).json({ error: "station and activity required" });
            return;
        }
        const existing = operationId ? fieldUpdates.find((u) => u.id === operationId) : null;
        if (existing) {
            res.json(existing);
            return;
        }
        const entry = {
            id: operationId ?? `fu-${crypto.randomUUID().slice(0, 8)}`,
            station,
            activity,
            siteConditions: siteConditions ?? "",
            notes: notes ?? "",
            loggedAt: new Date().toISOString(),
            syncStatus: "SYNCED",
        };
        fieldUpdates.push(entry);
        res.json(entry);
    };
    const listLocations = (req, res) => {
        const station = req.query.station;
        let locs = locationUpdates;
        if (station)
            locs = locs.filter((l) => l.station === station);
        res.json(locs);
    };
    const submitLocation = (req, res) => {
        const { station, lat, lon, operationId } = req.body ?? {};
        if (!station || lat === undefined || lon === undefined) {
            res.status(400).json({ error: "station, lat, lon required" });
            return;
        }
        const existing = operationId ? locationUpdates.find((l) => l.id === operationId) : null;
        if (existing) {
            res.json(existing);
            return;
        }
        const entry = {
            id: operationId ?? `loc-${crypto.randomUUID().slice(0, 8)}`,
            station,
            lat,
            lon,
            sharedAt: new Date().toISOString(),
            syncStatus: "SYNCED",
        };
        locationUpdates.push(entry);
        res.json(entry);
    };
    const listSos = (_req, res) => {
        res.json(sosEvents);
    };
    const triggerSos = (req, res) => {
        const { station, operationId } = req.body ?? {};
        if (!station) {
            res.status(400).json({ error: "station required" });
            return;
        }
        const existing = operationId ? sosEvents.find((s) => s.id === operationId) : null;
        if (existing) {
            res.json(existing);
            return;
        }
        const entry = {
            id: operationId ?? `sos-${crypto.randomUUID().slice(0, 8)}`,
            station,
            triggeredAt: new Date().toISOString(),
            syncStatus: "SYNCED",
            escalated: true,
        };
        sosEvents.push(entry);
        pushAlert({
            id: crypto.randomUUID(),
            severity: "critical",
            sos: true,
            message: `SOS triggered at ${station} — field app`,
            timestamp: new Date().toISOString(),
        });
        res.json(entry);
    };
    router.get("/updates", listUpdates);
    router.post("/updates", submitUpdate);
    router.get("/location", listLocations);
    router.post("/location", submitLocation);
    router.get("/sos", listSos);
    router.post("/sos", triggerSos);
    return router;
}
