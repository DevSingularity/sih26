"use client";

import { useStationContext } from "@/app/station/layout";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="p-6 space-y-6">
      <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
        {station.toUpperCase()} Sync Status
      </h1>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">PENDING</CardTitle></CardHeader>
          <CardContent><span className="font-display text-3xl font-bold text-accent-amber">{pendingCount}</span></CardContent>
        </Card>
        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">SYNCED</CardTitle></CardHeader>
          <CardContent><span className="font-display text-3xl font-bold text-ok">{syncedCount}</span></CardContent>
        </Card>
        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">FAILED</CardTitle></CardHeader>
          <CardContent><span className="font-display text-3xl font-bold text-critical">{failedCount}</span></CardContent>
        </Card>
      </div>

      <Card className="border-white/8 bg-panel/60">
        <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">SYNC QUEUE</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {stationItems.length === 0 ? (
            <p className="font-mono text-[9px] text-muted-ink">NO QUEUE ITEMS</p>
          ) : (
            stationItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border border-white/8 bg-white/3 px-3 py-2">
                <div className="flex-1">
                  <span className="font-mono text-[9px] text-ice">{item.action}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={cn("h-4 rounded-sm px-1.5 font-mono text-[8px]", STATUS_CLS[item.status])}>
                    {item.status}
                  </Badge>
                  <time className="font-mono text-[8px] tabular-nums text-muted-ink">{item.queuedAt.slice(5, 16).replace("T", " ")}</time>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
