"use client";

import { useStationContext } from "@/app/station/layout";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLS = {
  PENDING: "border-accent-amber/40 bg-accent-amber/10 text-accent-amber",
  SYNCED: "border-ok/40 bg-ok/10 text-ok",
  FAILED: "border-critical/40 bg-critical/10 text-critical",
} as const;

export default function StationSyncPage() {
  const { station } = useStationContext();
  const { items, pendingCount, syncedCount, failedCount } = useSyncStatus();

  const stationItems = items.filter((i) => i.station === station);

  return (
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
        {station.toUpperCase()} Sync Status
      </h1>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "PENDING", value: pendingCount, accent: "text-accent-amber" },
          { label: "SYNCED", value: syncedCount, accent: "text-ok" },
          { label: "FAILED", value: failedCount, accent: "text-critical" },
        ].map((stat) => (
          <div key={stat.label} className="card-panel p-5">
            <span className="label-mono mb-2 block">{stat.label}</span>
            <span className={cn("font-display text-4xl font-bold", stat.accent)}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="card-panel-static p-5">
        <h2 className="label-mono mb-4">SYNC QUEUE</h2>
        <div className="space-y-3">
          {stationItems.length === 0 ? (
            <p className="value-mono text-muted-ink py-4 text-center">No queue items</p>
          ) : (
            stationItems.map((item, i) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3 table-row-hover animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <span className="value-mono text-[12px] flex-1 min-w-0 truncate">{item.action}</span>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <Badge variant="outline" className={cn("h-5 rounded-md px-2 font-mono text-[10px]", STATUS_CLS[item.status])}>
                    {item.status}
                  </Badge>
                  <time className="font-mono text-[10px] tabular-nums text-muted-ink">{item.queuedAt.slice(5, 16).replace("T", " ")}</time>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
