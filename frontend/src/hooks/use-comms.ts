"use client";

import { useEffect, useState } from "react";
import { getJson } from "@/lib/api";
import type { CommsLogEntry } from "@/lib/types";

export function useComms() {
  const [entries, setEntries] = useState<CommsLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJson<CommsLogEntry[]>("/comms")
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { entries, loading };
}
