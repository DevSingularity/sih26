"use client";

import { useStationContext } from "@/app/station/layout";
import { useInventory } from "@/hooks/use-cargo";
import { cn } from "@/lib/utils";

export default function StationResourcesPage() {
  const { station } = useStationContext();
  const { snapshots } = useInventory(station);

  return (
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
        {station.toUpperCase()} Resource Management
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {snapshots.map((s) => {
          const daysLeft = Math.round(s.stockQty / s.consumptionRate);
          const barPct = Math.min(100, (daysLeft / 90) * 100);
          return (
            <div key={s.itemType} className="card-panel p-5 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="label-mono">{s.itemType.toUpperCase()}</span>
                <span className={cn(
                  "font-mono text-[12px] font-semibold",
                  daysLeft < 14 ? "text-critical" : daysLeft < 30 ? "text-warn" : "text-ok"
                )}>
                  {daysLeft} days left
                </span>
              </div>
              <div className="flex items-end justify-between mb-3">
                <span className="font-display text-3xl font-bold text-ice">{s.stockQty}</span>
                <span className="font-mono text-[11px] text-muted-ink">units</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/5 overflow-hidden mb-3">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    daysLeft < 14 ? "bg-critical" : daysLeft < 30 ? "bg-warn" : "bg-ok",
                  )}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-ink">CONSUMPTION: {s.consumptionRate}/day</span>
                <span className="font-mono text-[10px] text-muted-ink">UPDATED: {s.lastUpdated.slice(5, 10)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
