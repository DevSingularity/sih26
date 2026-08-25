"use client";

import { useState } from "react";
import { useStationContext } from "@/app/station/layout";
import { useCargo, useInventory } from "@/hooks/use-cargo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CargoCustodyState } from "@/lib/types";

const CUSTODY_CLS: Record<CargoCustodyState, string> = {
  INDENTED: "border-muted-ink/40 bg-muted-ink/10 text-muted-ink",
  DISPATCHED: "border-accent-blue/40 bg-accent-blue/10 text-accent-blue",
  IN_TRANSIT: "border-accent-amber/40 bg-accent-amber/10 text-accent-amber",
  INWARD: "border-ok/40 bg-ok/10 text-ok",
  ISSUED: "border-accent-purple/40 bg-accent-purple/10 text-accent-purple",
};

export default function StationCargoPage() {
  const { station } = useStationContext();
  const { items } = useCargo();
  const { snapshots } = useInventory(station);

  const stationItems = items.filter(
    (c) => c.currentLocation === station || c.currentLocation === "in-transit",
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
        {station.toUpperCase()} Cargo & Inventory
      </h1>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">STOCK LEVELS</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {snapshots.map((s) => (
              <div key={s.itemType} className="flex items-center justify-between rounded-md border border-white/8 bg-white/3 px-3 py-2">
                <span className="font-mono text-[9px] text-ice">{s.itemType.toUpperCase()}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-ice">{s.stockQty} units</span>
                  <span className="font-mono text-[8px] text-muted-ink">-{s.consumptionRate}/day</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">INCOMING CARGO ({stationItems.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stationItems.length === 0 ? (
              <p className="font-mono text-[9px] text-muted-ink">NO CARGO ITEMS</p>
            ) : (
              stationItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-md border border-white/8 bg-white/3 px-3 py-2">
                  <div>
                    <span className="font-mono text-[9px] text-ice">{item.category}</span>
                    <span className="ml-2 font-mono text-[8px] text-muted-ink">{item.qrCode}</span>
                  </div>
                  <Badge variant="outline" className={cn("h-4 rounded-sm px-1.5 font-mono text-[8px]", CUSTODY_CLS[item.custodyState])}>
                    {item.custodyState}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
