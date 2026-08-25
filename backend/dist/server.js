import express from "express";
import http from "node:http";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { getStateUpdate, startSimulator } from "./simulator.js";
import { createRouter } from "./routes.js";
import { createExpeditionsRouter, createCargoRouter, createTrackingRouter } from "./expeditions.js";
import { createRiskRouter, createRecommendationsRouter } from "./risk.js";
import { createCommsRouter } from "./comms.js";
import { createWasteRouter } from "./waste.js";
import { createSyncRouter } from "./sync.js";
import { createFieldRouter } from "./field.js";
const app = express();
app.use(cors());
app.use(express.json());
app.use(createRouter(broadcast));
app.use("/expeditions", createExpeditionsRouter());
app.use("/cargo", createCargoRouter());
app.use("/tracking", createTrackingRouter());
app.use("/risk", createRiskRouter());
app.use("/recommendations", createRecommendationsRouter());
app.use("/comms", createCommsRouter());
app.use("/waste", createWasteRouter());
app.use("/sync-status", createSyncRouter());
app.use("/field", createFieldRouter());
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/twin" });
function broadcast() {
    const payload = JSON.stringify(getStateUpdate());
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
}
wss.on("connection", (ws) => {
    ws.send(JSON.stringify(getStateUpdate()));
});
const errorHandler = (err, _req, res, _next) => {
    if (typeof err === "object" && err !== null && "type" in err && err.type === "entity.parse.failed") {
        res.status(400).json({ error: "invalid_json" });
        return;
    }
    console.error("[polarops] unhandled error:", err);
    res.status(500).json({ error: "internal_error" });
};
app.use(errorHandler);
const port = Number(process.env.PORT ?? 4000);
startSimulator(broadcast);
server.listen(port, () => {
    console.log(`[polarops] REST on :${port} · WS on /ws/twin`);
});
