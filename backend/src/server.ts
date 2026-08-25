import express from "express";
import type { ErrorRequestHandler } from "express";
import http from "node:http";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { getStateUpdate, startSimulator } from "./simulator.js";
import { createRouter } from "./routes.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(createRouter(broadcast));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/twin" });

function broadcast(): void {
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

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
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
