"use client";

import { useEffect, useState } from "react";
import { getJson } from "@/lib/api";
import type { SyncQueueItem } from "@/lib/types";

export function useSyncStatus() {
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJson<SyncQueueItem[]>("/sync-status")
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pendingCount = items.filter((i) => i.status === "PENDING").length;
  const syncedCount = items.filter((i) => i.status === "SYNCED").length;
  const failedCount = items.filter((i) => i.status === "FAILED").length;

  return { items, loading, pendingCount, syncedCount, failedCount };
}
