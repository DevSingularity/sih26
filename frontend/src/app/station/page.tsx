"use client";

import { useStationContext } from "@/app/station/layout";
import { useRiskAlerts } from "@/hooks/use-risk-alerts";
import { useCargo } from "@/hooks/use-cargo";
import { useRecommendations } from "@/hooks/use-recommendations";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLS = {
  ok: "border-ok/40 bg-ok/10 text-ok",
  warn: "border-warn/40 bg-warn/10 text-warn",
  critical: "border-critical/40 bg-critical/10 text-critical",
} as const;

export default function StationDashboard() {
  const { station } = useStationContext();
  const { alerts } = useRiskAlerts();
  const { items: cargo } = useCargo();
  const { recommendations } = useRecommendations();
  const { pendingCount, failedCount } = useSyncStatus();

  const stationAlerts = alerts.filter((a) => a.station === station && a.resolvedAt === null);
  const stationCargo = cargo.filter((c) => c.currentLocation === station || c.currentLocation === "in-transit");
  const pendingRecs = recommendations.filter((r) => r.status === "PENDING");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
          {station.toUpperCase()} Operations Dashboard
        </h1>
        <span className="font-mono text-[9px] tracking-[0.2em] text-muted-ink">
          {new Date().toISOString().slice(0, 16).replace("T", " ")} UTC
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">ACTIVE RISKS</CardTitle></CardHeader>
          <CardContent>
            <span className="font-display text-3xl font-bold text-critical">{stationAlerts.length}</span>
          </CardContent>
        </Card>
        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">CARGO ITEMS</CardTitle></CardHeader>
          <CardContent>
            <span className="font-display text-3xl font-bold text-accent-amber">{stationCargo.length}</span>
          </CardContent>
        </Card>
        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">PENDING RECS</CardTitle></CardHeader>
          <CardContent>
            <span className="font-display text-3xl font-bold text-accent-purple">{pendingRecs.length}</span>
          </CardContent>
        </Card>
        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">SYNC STATUS</CardTitle></CardHeader>
          <CardContent>
            <span className={cn("font-display text-3xl font-bold", pendingCount > 0 ? "text-warn" : "text-ok")}>{pendingCount}</span>
            <span className="ml-2 font-mono text-[9px] text-muted-ink">pending</span>
            {failedCount > 0 && <span className="ml-2 font-mono text-[9px] text-critical">{failedCount} failed</span>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">RISK ALERTS</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stationAlerts.length === 0 ? (
              <p className="font-mono text-[9px] text-muted-ink">NO ACTIVE RISKS</p>
            ) : (
              stationAlerts.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-white/8 bg-white/3 px-3 py-2">
                  <div className="flex-1">
                    <Badge variant="outline" className={cn("h-4 rounded-sm px-1.5 font-mono text-[8px] tracking-[0.14em]", STATUS_CLS[r.severity])}>
                      {r.type}
                    </Badge>
                    <p className="mt-1 text-xs text-ice">{r.message}</p>
                  </div>
                  <time className="shrink-0 ml-4 font-mono text-[8px] tabular-nums text-muted-ink">{r.raisedAt.slice(5, 10)}</time>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">PENDING RECOMMENDATIONS</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingRecs.length === 0 ? (
              <p className="font-mono text-[9px] text-muted-ink">NO PENDING RECOMMENDATIONS</p>
            ) : (
              pendingRecs.map((r) => (
                <div key={r.id} className="rounded-md border border-white/8 bg-white/3 px-3 py-2">
                  <p className="text-xs text-ice">{r.suggestedAction}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
