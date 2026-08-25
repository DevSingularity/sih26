"use client";

import { useStationContext } from "@/app/station/layout";
import { useRiskAlerts } from "@/hooks/use-risk-alerts";
import { useCargo } from "@/hooks/use-cargo";
import { useRecommendations } from "@/hooks/use-recommendations";
import { useSyncStatus } from "@/hooks/use-sync-status";
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
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
          {station.toUpperCase()} Operations Dashboard
        </h1>
        <span className="font-mono text-[11px] tracking-[0.12em] text-muted-ink">
          {new Date().toISOString().slice(0, 16).replace("T", " ")} UTC
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "ACTIVE RISKS", value: stationAlerts.length, accent: "text-critical" },
          { label: "CARGO ITEMS", value: stationCargo.length, accent: "text-accent-amber" },
          { label: "PENDING RECS", value: pendingRecs.length, accent: "text-accent-purple" },
          { label: "SYNC PENDING", value: pendingCount, accent: pendingCount > 0 ? "text-warn" : "text-ok" },
        ].map((stat) => (
          <div key={stat.label} className="card-panel p-5">
            <span className="label-mono mb-2 block">{stat.label}</span>
            <span className={cn("font-display text-4xl font-bold", stat.accent)}>{stat.value}</span>
            {stat.label === "SYNC PENDING" && failedCount > 0 && (
              <span className="ml-2 font-mono text-[11px] text-critical">{failedCount} failed</span>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-panel-static p-5">
          <h2 className="label-mono mb-4">RISK ALERTS</h2>
          <div className="space-y-3">
            {stationAlerts.length === 0 ? (
              <p className="value-mono text-muted-ink py-4 text-center">No active risks</p>
            ) : (
              stationAlerts.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3 table-row-hover">
                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className={cn("h-5 rounded-md px-2 font-mono text-[10px] tracking-[0.12em] mb-1", STATUS_CLS[r.severity])}>
                      {r.type}
                    </Badge>
                    <p className="text-[13px] text-ice leading-snug truncate">{r.message}</p>
                  </div>
                  <time className="shrink-0 ml-4 font-mono text-[10px] tabular-nums text-muted-ink">{r.raisedAt.slice(5, 10)}</time>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card-panel-static p-5">
          <h2 className="label-mono mb-4">PENDING RECOMMENDATIONS</h2>
          <div className="space-y-3">
            {pendingRecs.length === 0 ? (
              <p className="value-mono text-muted-ink py-4 text-center">No pending recommendations</p>
            ) : (
              pendingRecs.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 table-row-hover">
                  <p className="text-[13px] text-ice leading-snug">{r.suggestedAction}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
