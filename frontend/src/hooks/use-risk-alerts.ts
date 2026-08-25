"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson } from "@/lib/api";
import type { RiskAlert } from "@/lib/types";

export function useRiskAlerts() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJson<RiskAlert[]>("/risk")
      .then(setAlerts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { alerts, loading };
}
