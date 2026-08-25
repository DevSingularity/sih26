"use client";

import { useStationContext } from "@/app/station/layout";
import { useCargo, useInventory } from "@/hooks/use-cargo";
import { Badge } from "@/components/ui/badge";
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
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
        {station.toUpperCase()} Cargo & Inventory
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-panel-static p-5">
          <h2 className="label-mono mb-4">STOCK LEVELS</h2>
          <div className="space-y-3">
            {snapshots.map((s) => (
              <div key={s.itemType} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3 table-row-hover">
                <span className="value-mono text-[12px]">{s.itemType.toUpperCase()}</span>
                <div className="flex items-center gap-4">
                  <span className="value-mono text-[12px]">{s.stockQty} units</span>
                  <span className="font-mono text-[10px] text-muted-ink">-{s.consumptionRate}/day</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-panel-static p-5">
          <h2 className="label-mono mb-4">INCOMING CARGO ({stationItems.length})</h2>
          <div className="space-y-3">
            {stationItems.length === 0 ? (
              <p className="value-mono text-muted-ink py-4 text-center">No cargo items</p>
            ) : (
              stationItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3 table-row-hover">
                  <div className="flex items-center gap-3">
                    <span className="value-mono text-[12px]">{item.category}</span>
                    <span className="font-mono text-[10px] text-muted-ink">{item.qrCode}</span>
                  </div>
                  <Badge variant="outline" className={cn("h-5 rounded-md px-2 font-mono text-[10px]", CUSTODY_CLS[item.custodyState])}>
                    {item.custodyState}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
