import { Router } from "express";
import { commsLog } from "./state.js";
export function createCommsRouter() {
    const router = Router();
    const listHandler = (_req, res) => {
        res.json(commsLog);
    };
    const sendHandler = (req, res) => {
        const { direction, message } = req.body ?? {};
        if (!direction || !message) {
            res.status(400).json({ error: "direction and message required" });
            return;
        }
        const entry = {
            id: `comms-${crypto.randomUUID().slice(0, 8)}`,
            direction,
            message,
            timestamp: new Date().toISOString(),
        };
        commsLog.push(entry);
        res.json(entry);
    };
    router.get("/", listHandler);
    router.post("/", sendHandler);
    return router;
}
