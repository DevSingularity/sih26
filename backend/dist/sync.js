import { Router } from "express";
import { syncQueue } from "./state.js";
export function createSyncRouter() {
    const router = Router();
    const statusHandler = (_req, res) => {
        res.json(syncQueue);
    };
    const drainHandler = (req, res) => {
        const { station } = req.body ?? {};
        const pending = syncQueue.filter((s) => s.status === "PENDING" && (!station || s.station === station));
        for (const item of pending) {
            item.status = "SYNCED";
        }
        res.json({ synced: pending.length });
    };
    router.get("/", statusHandler);
    router.post("/drain", drainHandler);
    return router;
}
