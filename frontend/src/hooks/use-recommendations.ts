"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson, postJson } from "@/lib/api";
import type { Recommendation } from "@/lib/types";

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJson<Recommendation[]>("/recommendations")
      .then(setRecommendations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const actOnRecommendation = useCallback(async (id: string, status: "ACCEPTED" | "DISMISSED") => {
    const rec = await postJson<Recommendation>(`/recommendations/${id}/action`, { status });
    setRecommendations((prev) => prev.map((r) => (r.id === id ? rec : r)));
    return rec;
  }, []);

  return { recommendations, loading, actOnRecommendation };
}
