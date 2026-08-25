"use client";

import { useStationContext } from "@/app/station/layout";
import { useInventory } from "@/hooks/use-cargo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StationResourcesPage() {
  const { station } = useStationContext();
  const { snapshots } = useInventory(station);

  function getBarWidth(rate: number, max: number): number {
    return Math.min(100, (rate / max) * 100);
  }

  function getStatusColor(stock: number, rate: number): string {
    const daysLeft = stock / rate;
    if (daysLeft < 14) return "text-critical";
    if (daysLeft < 30) return "text-warn";
    return "text-ok";
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
        {station.toUpperCase()} Resource Management
      </h1>

      <div className="grid grid-cols-2 gap-4">
        {snapshots.map((s) => {
          const daysLeft = Math.round(s.stockQty / s.consumptionRate);
          return (
            <Card key={s.itemType} className="border-white/8 bg-panel/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">
                    {s.itemType.toUpperCase()}
                  </CardTitle>
                  <span className={cn("font-mono text-xs font-semibold", getStatusColor(s.stockQty, s.consumptionRate))}>
                    {daysLeft} days left
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <span className="font-display text-2xl font-bold text-ice">{s.stockQty}</span>
                  <span className="font-mono text-[9px] text-muted-ink">units</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      daysLeft < 14 ? "bg-critical" : daysLeft < 30 ? "bg-warn" : "bg-ok",
                    )}
                    style={{ width: `${getBarWidth(s.stockQty, s.stockQty * 1.2)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[8px] text-muted-ink">CONSUMPTION: {s.consumptionRate}/day</span>
                  <span className="font-mono text-[8px] text-muted-ink">UPDATED: {s.lastUpdated.slice(5, 10)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
