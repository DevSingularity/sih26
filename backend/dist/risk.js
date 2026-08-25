import { Router } from "express";
import { riskAlerts, recommendations, } from "./state.js";
export function createRiskRouter() {
    const router = Router();
    const listAlerts = (_req, res) => {
        res.json(riskAlerts);
    };
    const updateThreshold = (req, res) => {
        const { severity, relatedEntity } = req.body ?? {};
        res.json({ ok: true, message: `Threshold updated for ${relatedEntity ?? "global"}: severity=${severity ?? "unchanged"}` });
    };
    router.get("/", listAlerts);
    router.post("/threshold", updateThreshold);
    return router;
}
export function createRecommendationsRouter() {
    const router = Router();
    const listHandler = (_req, res) => {
        res.json(recommendations);
    };
    const actionHandler = (req, res) => {
        const rec = recommendations.find((r) => r.id === req.params.id);
        if (!rec) {
            res.status(404).json({ error: "not_found" });
            return;
        }
        const { status } = req.body ?? {};
        if (status === "ACCEPTED" || status === "DISMISSED") {
            rec.status = status;
        }
        res.json(rec);
    };
    router.get("/", listHandler);
    router.post("/:id/action", actionHandler);
    return router;
}
