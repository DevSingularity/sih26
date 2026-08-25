"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  STATIONS,
  type Alert,
  type Asset,
  type StationId,
  type TwinFrame,
} from "@/lib/types";
import { postJson } from "@/lib/api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws/twin";

export interface QueuedAction {
  id: string;
  station: StationId;
  action: string;
  queued_at: string;
}

function isTwinFrame(value: unknown): value is TwinFrame {
  if (typeof value !== "object" || value === null) return false;
  const frame = value as Record<string, unknown>;
  return (
    frame.type === "state_update" &&
    typeof frame.assets === "object" &&
    frame.assets !== null &&
    Array.isArray(frame.alerts)
  );
}

function makeLocalAlert(severity: Alert["severity"], message: string): Alert {
  return {
    id: crypto.randomUUID(),
    severity,
    message,
    timestamp: new Date().toISOString(),
  };
}

export function useTwin() {
  const [assets, setAssets] = useState<Record<string, Asset>>({});
  const [serverAlerts, setServerAlerts] = useState<Alert[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastTickAt, setLastTickAt] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const [localAlerts, setLocalAlerts] = useState<Alert[]>([]);

  const queueRef = useRef<QueuedAction[]>([]);
  const drainingRef = useRef(false);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connect = () => {
      socket = new WebSocket(WS_URL);
      socket.onopen = () => setConnected(true);
      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const frame: unknown = JSON.parse(String(event.data));
          if (!isTwinFrame(frame)) return;
          setAssets(frame.assets);
          setServerAlerts(frame.alerts);
          setLastTickAt(Date.now());
        } catch {
          return;
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (!disposed) retryTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    if (drainingRef.current) return;
    const batch = queueRef.current;
    if (batch.length === 0) return;

    drainingRef.current = true;

    void (async () => {
      try {
        const syncedIds = new Set<string>();
        for (const item of batch) {
          try {
            await postJson("/sync", { queued_at: item.queued_at, action: item.action });
            syncedIds.add(item.id);
          } catch {
            continue;
          }
        }
        queueRef.current = queueRef.current.filter((i) => !syncedIds.has(i.id));
        setQueuedActions(queueRef.current);
        if (syncedIds.size > 0) {
          setLocalAlerts((prev) => [
            makeLocalAlert("ok", `Synced ${syncedIds.size} actions — field log reconciled`),
            ...prev,
          ]);
        }
      } finally {
        drainingRef.current = false;
      }
    })();
  }, [isOnline]);

  const logCargo = useCallback(
    (station: StationId) => {
      const name = STATIONS.find((s) => s.id === station)?.name ?? station;
      const action = `Cargo received logged at ${name}`;

      if (!isOnline) {
        const entry: QueuedAction = {
          id: crypto.randomUUID(),
          station,
          action,
          queued_at: new Date().toISOString(),
        };
        queueRef.current = [...queueRef.current, entry];
        setQueuedActions(queueRef.current);
        return;
      }

      void postJson("/sync", {
        queued_at: new Date().toISOString(),
        action,
      }).catch(() => undefined);
      setLocalAlerts((prev) => [makeLocalAlert("ok", `Field log synced — ${action}`), ...prev]);
    },
    [isOnline],
  );

  const triggerSos = useCallback((station: StationId) => {
    void postJson("/sos", { station }).catch(() => undefined);
  }, []);

  const displayAlerts = useMemo(
    () =>
      [...localAlerts, ...serverAlerts].sort((a, b) =>
        b.timestamp.localeCompare(a.timestamp),
      ),
    [localAlerts, serverAlerts],
  );

  const pendingByStation = useMemo(() => {
    const acc: Record<StationId, number> = { maitri: 0, bharati: 0 };
    for (const item of queuedActions) acc[item.station] += 1;
    return acc;
  }, [queuedActions]);

  return {
    assets,
    serverAlerts,
    displayAlerts,
    connected,
    lastTickAt,
    isOnline,
    setIsOnline,
    queuedActions,
    pendingCount: queuedActions.length,
    pendingByStation,
    logCargo,
    triggerSos,
  };
}
