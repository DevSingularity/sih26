"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson, postJson } from "@/lib/api";
import type { CargoItem, CargoMovementEvent, InventorySnapshot, StationId } from "@/lib/types";

export function useCargo(expeditionId?: string) {
  const [items, setItems] = useState<CargoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = expeditionId ? `?expeditionId=${expeditionId}` : "";
    getJson<CargoItem[]>(`/cargo${params}`)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [expeditionId]);

  const moveCargo = useCallback(async (id: string, toLocation: string, recordedBy?: string) => {
    const result = await postJson<{ item: CargoItem; event: CargoMovementEvent }>(`/cargo/${id}/move`, { toLocation, recordedBy });
    setItems((prev) => prev.map((c) => (c.id === id ? result.item : c)));
    return result;
  }, []);

  return { items, loading, moveCargo };
}

export function useInventory(station?: StationId) {
  const [snapshots, setSnapshots] = useState<InventorySnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = station ? `?station=${station}` : "";
    getJson<InventorySnapshot[]>(`/cargo/inventory${params}`)
      .then(setSnapshots)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [station]);

  return { snapshots, loading };
}

export function useCargoMovements(cargoItemId: string | null) {
  const [events, setEvents] = useState<CargoMovementEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cargoItemId) { setLoading(false); return; }
    getJson<CargoMovementEvent[]>(`/cargo/${cargoItemId}/movements`)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cargoItemId]);

  return { events, loading };
}
