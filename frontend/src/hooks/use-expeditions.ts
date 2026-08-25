"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson, postJson } from "@/lib/api";
import type { Expedition } from "@/lib/types";

export function useExpeditions() {
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJson<Expedition[]>("/expeditions")
      .then(setExpeditions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createExpedition = useCallback(
    async (data: { name: string; route: string[]; startDate: string; createdBy?: string; personnelAssigned?: string[]; cargoRequirementSummary?: string }) => {
      const exp = await postJson<Expedition>("/expeditions", data);
      setExpeditions((prev) => [...prev, exp]);
      return exp;
    },
    [],
  );

  return { expeditions, loading, createExpedition };
}

export function useExpedition(id: string | null) {
  const [expedition, setExpedition] = useState<(Expedition & { cargo: import("@/lib/types").CargoItem[]; shipments: import("@/lib/types").ShipmentTrack[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    getJson<Expedition & { cargo: import("@/lib/types").CargoItem[]; shipments: import("@/lib/types").ShipmentTrack[] }>(`/expeditions/${id}`)
      .then(setExpedition)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return { expedition, loading };
}
