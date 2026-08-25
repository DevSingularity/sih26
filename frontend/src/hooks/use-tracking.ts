"use client";

import { useEffect, useState } from "react";
import { getJson } from "@/lib/api";
import type { ShipmentTrack } from "@/lib/types";

export function useTracking(expeditionId?: string) {
  const [tracks, setTracks] = useState<ShipmentTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = expeditionId ? `?expeditionId=${expeditionId}` : "";
    getJson<ShipmentTrack[]>(`/tracking${params}`)
      .then(setTracks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [expeditionId]);

  return { tracks, loading };
}
