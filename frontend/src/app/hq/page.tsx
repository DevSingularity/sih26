"use client";

import { useExpeditions } from "@/hooks/use-expeditions";
import { useRiskAlerts } from "@/hooks/use-risk-alerts";
import { useTracking } from "@/hooks/use-tracking";
import { useComms } from "@/hooks/use-comms";
import { useCargo } from "@/hooks/use-cargo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLS = {
  ok: "border-ok/40 bg-ok/10 text-ok",
  warn: "border-warn/40 bg-warn/10 text-warn",
  critical: "border-critical/40 bg-critical/10 text-critical",
} as const;

export default function HqOverview() {
  const { expeditions } = useExpeditions();
  const { alerts } = useRiskAlerts();
  const { tracks } = useTracking();
  const { entries: comms } = useComms();
  const { items: cargo } = useCargo();

  const activeExpeditions = expeditions.filter((e) => e.status === "ACTIVE");
  const pendingCargo = cargo.filter((c) => c.custodyState === "IN_TRANSIT" || c.custodyState === "DISPATCHED");
  const activeRisks = alerts.filter((a) => a.resolvedAt === null);
  const delayedShipments = tracks.filter((t) => t.status === "DELAYED");

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
          HQ Command Overview
        </h1>
        <span className="font-mono text-[11px] tracking-[0.12em] text-muted-ink">
          {new Date().toISOString().slice(0, 16).replace("T", " ")} UTC
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "ACTIVE EXPEDITIONS", value: activeExpeditions.length, sub: `/ ${expeditions.length} total`, accent: "text-accent-blue", icon: "◆" },
          { label: "ACTIVE RISKS", value: activeRisks.length, sub: "alerts", accent: "text-critical", icon: "⚠" },
          { label: "CARGO IN TRANSIT", value: pendingCargo.length, sub: "items", accent: "text-accent-amber", icon: "📦" },
          { label: "DELAYED SHIPMENTS", value: delayedShipments.length, sub: "legs", accent: "text-warn", icon: "⏱" },
        ].map((stat) => (
          <div key={stat.label} className="card-panel p-5 group">
            <div className="flex items-center justify-between mb-3">
              <span className="label-mono">{stat.label}</span>
              <span className="text-lg opacity-40">{stat.icon}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("font-display text-4xl font-bold", stat.accent)}>{stat.value}</span>
              <span className="font-mono text-[11px] text-muted-ink">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Risk Alerts */}
        <div className="card-panel-static p-5">
          <h2 className="label-mono mb-4">ACTIVE RISK ALERTS</h2>
          <div className="space-y-3">
            {activeRisks.length === 0 ? (
              <p className="value-mono text-muted-ink py-4 text-center">No active risks</p>
            ) : (
              activeRisks.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3 transition-all duration-200 hover:bg-white/6 hover:border-white/12">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={cn("h-5 rounded-md px-2 font-mono text-[10px] tracking-[0.12em]", STATUS_CLS[r.severity])}>
                        {r.type}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-ink">{r.station.toUpperCase()}</span>
                    </div>
                    <p className="text-[13px] text-ice leading-snug truncate">{r.message}</p>
                  </div>
                  <time className="shrink-0 ml-4 font-mono text-[10px] tabular-nums text-muted-ink">{r.raisedAt.slice(5, 10)}</time>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest Comms */}
        <div className="card-panel-static p-5">
          <h2 className="label-mono mb-4">LATEST COMMS</h2>
          <div className="space-y-3">
            {comms.slice(-4).reverse().map((c) => (
              <div key={c.id} className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 transition-all duration-200 hover:bg-white/6">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className={cn(
                    "h-5 rounded-md px-2 font-mono text-[10px] tracking-[0.12em]",
                    c.direction === "HQ_TO_ADMIN" ? "border-accent-blue/40 bg-accent-blue/10 text-accent-blue" : "border-ok/40 bg-ok/10 text-ok"
                  )}>
                    {c.direction === "HQ_TO_ADMIN" ? "HQ → STATION" : "STATION → HQ"}
                  </Badge>
                  <time className="font-mono text-[10px] tabular-nums text-muted-ink">{c.timestamp.slice(5, 16).replace("T", " ")}</time>
                </div>
                <p className="text-[13px] text-ice leading-snug">{c.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
