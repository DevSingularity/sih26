"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openDB, type IDBPDatabase } from "idb";
import { postJson } from "@/lib/api";

interface OutboxItem {
  id: string;
  type: "update" | "location" | "sos";
  data: Record<string, unknown>;
  status: "PENDING" | "SYNCED" | "FAILED";
  queuedAt: string;
}

const DB_NAME = "polarops-field";
const DB_VERSION = 1;
const STORE_NAME = "outbox";

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    },
  });
}

async function loadOutbox(): Promise<OutboxItem[]> {
  try {
    const db = await getDb();
    const items = await db.getAll(STORE_NAME);
    await db.close();
    return items;
  } catch {
    return [];
  }
}

async function saveToOutbox(item: OutboxItem): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, item);
  await db.close();
}

async function updateOutboxItem(item: OutboxItem): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, item);
  await db.close();
}

async function clearSynced(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const all = await store.getAll();
  for (const item of all) {
    if (item.status === "SYNCED") {
      await store.delete(item.id);
    }
  }
  await tx.done;
  await db.close();
}

const ENDPOINT_MAP = {
  update: "/field/updates",
  location: "/field/location",
  sos: "/field/sos",
} as const;

export function useFieldSync() {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const drainingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    const items = await loadOutbox();
    setPendingCount(items.filter((i) => i.status === "PENDING").length);
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const drainOutbox = useCallback(async () => {
    if (drainingRef.current || !isOnline) return;
    drainingRef.current = true;

    try {
      const items = await loadOutbox();
      const pending = items.filter((i) => i.status === "PENDING");

      for (const item of pending) {
        try {
          const endpoint = ENDPOINT_MAP[item.type];
          await postJson(endpoint, { ...item.data, operationId: item.id });
          item.status = "SYNCED";
          await updateOutboxItem(item);
        } catch {
          item.status = "FAILED";
          await updateOutboxItem(item);
        }
      }

      await clearSynced();
      await refreshCount();
    } finally {
      drainingRef.current = false;
    }
  }, [isOnline, refreshCount]);

  useEffect(() => {
    if (isOnline) {
      void drainOutbox();
    }
  }, [isOnline, drainOutbox]);

  const submitFieldUpdate = useCallback(async (data: { station: string; activity: string; siteConditions: string; notes: string }) => {
    const operationId = crypto.randomUUID();
    const item: OutboxItem = {
      id: operationId,
      type: "update",
      data,
      status: "PENDING",
      queuedAt: new Date().toISOString(),
    };

    await saveToOutbox(item);
    await refreshCount();

    if (isOnline) {
      try {
        await postJson("/field/updates", { ...data, operationId });
        item.status = "SYNCED";
        await updateOutboxItem(item);
        await refreshCount();
      } catch {
        // Will retry on next drain
      }
    }

    return operationId;
  }, [isOnline, refreshCount]);

  const submitLocationUpdate = useCallback(async (data: { station: string; lat: number; lon: number }) => {
    const operationId = crypto.randomUUID();
    const item: OutboxItem = {
      id: operationId,
      type: "location",
      data,
      status: "PENDING",
      queuedAt: new Date().toISOString(),
    };

    await saveToOutbox(item);
    await refreshCount();

    if (isOnline) {
      try {
        await postJson("/field/location", { ...data, operationId });
        item.status = "SYNCED";
        await updateOutboxItem(item);
        await refreshCount();
      } catch {
        // Will retry on next drain
      }
    }

    return operationId;
  }, [isOnline, refreshCount]);

  const triggerSos = useCallback(async (data: { station: string }) => {
    const operationId = crypto.randomUUID();
    const item: OutboxItem = {
      id: operationId,
      type: "sos",
      data,
      status: "PENDING",
      queuedAt: new Date().toISOString(),
    };

    await saveToOutbox(item);
    await refreshCount();

    if (isOnline) {
      try {
        await postJson("/field/sos", { ...data, operationId });
        item.status = "SYNCED";
        await updateOutboxItem(item);
        await refreshCount();
      } catch {
        // Will retry on next drain
      }
    }

    return operationId;
  }, [isOnline, refreshCount]);

  return {
    isOnline,
    pendingCount,
    submitFieldUpdate,
    submitLocationUpdate,
    triggerSos,
    drainOutbox,
  };
}
