"use client";

import { useEffect, useState } from "react";
import { getJson } from "@/lib/api";
import type { WasteLogEntry, StationId } from "@/lib/types";

export function useWaste(station?: StationId) {
  const [entries, setEntries] = useState<WasteLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = station ? `?station=${station}` : "";
    getJson<WasteLogEntry[]>(`/waste${params}`)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [station]);

  return { entries, loading };
}
