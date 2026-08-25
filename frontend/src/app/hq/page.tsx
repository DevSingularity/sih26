"use client";

import { useExpeditions } from "@/hooks/use-expeditions";
import { useRiskAlerts } from "@/hooks/use-risk-alerts";
import { useTracking } from "@/hooks/use-tracking";
import { useComms } from "@/hooks/use-comms";
import { useCargo } from "@/hooks/use-cargo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
          HQ Command Overview
        </h1>
        <span className="font-mono text-[9px] tracking-[0.2em] text-muted-ink">
          {new Date().toISOString().slice(0, 16).replace("T", " ")} UTC
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="border-white/8 bg-panel/60">
          <CardHeader>
            <CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">ACTIVE EXPEDITIONS</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-display text-3xl font-bold text-accent-blue">{activeExpeditions.length}</span>
            <span className="ml-2 font-mono text-[9px] text-muted-ink">/ {expeditions.length} total</span>
          </CardContent>
        </Card>
        <Card className="border-white/8 bg-panel/60">
          <CardHeader>
            <CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">ACTIVE RISKS</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-display text-3xl font-bold text-critical">{activeRisks.length}</span>
            <span className="ml-2 font-mono text-[9px] text-muted-ink">alerts</span>
          </CardContent>
        </Card>
        <Card className="border-white/8 bg-panel/60">
          <CardHeader>
            <CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">CARGO IN TRANSIT</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-display text-3xl font-bold text-accent-amber">{pendingCargo.length}</span>
            <span className="ml-2 font-mono text-[9px] text-muted-ink">items</span>
          </CardContent>
        </Card>
        <Card className="border-white/8 bg-panel/60">
          <CardHeader>
            <CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">DELAYED SHIPMENTS</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-display text-3xl font-bold text-warn">{delayedShipments.length}</span>
            <span className="ml-2 font-mono text-[9px] text-muted-ink">legs</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-white/8 bg-panel/60">
          <CardHeader>
            <CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">ACTIVE RISK ALERTS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeRisks.length === 0 ? (
              <p className="font-mono text-[9px] text-muted-ink">NO ACTIVE RISKS</p>
            ) : (
              activeRisks.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-white/8 bg-white/3 px-3 py-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("h-4 rounded-sm px-1.5 font-mono text-[8px] tracking-[0.14em]", STATUS_CLS[r.severity])}>
                        {r.type}
                      </Badge>
                      <span className="font-mono text-[9px] text-muted-ink">{r.station.toUpperCase()}</span>
                    </div>
                    <p className="mt-1 text-xs text-ice">{r.message}</p>
                  </div>
                  <time className="shrink-0 ml-4 font-mono text-[8px] tabular-nums text-muted-ink">{r.raisedAt.slice(5, 10)}</time>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-panel/60">
          <CardHeader>
            <CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">LATEST COMMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {comms.slice(-4).reverse().map((c) => (
              <div key={c.id} className="rounded-md border border-white/8 bg-white/3 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(
                    "h-4 rounded-sm px-1.5 font-mono text-[8px] tracking-[0.14em]",
                    c.direction === "HQ_TO_ADMIN" ? "border-accent-blue/40 bg-accent-blue/10 text-accent-blue" : "border-ok/40 bg-ok/10 text-ok"
                  )}>
                    {c.direction === "HQ_TO_ADMIN" ? "HQ → STATION" : "STATION → HQ"}
                  </Badge>
                  <time className="font-mono text-[8px] tabular-nums text-muted-ink">{c.timestamp.slice(5, 16).replace("T", " ")}</time>
                </div>
                <p className="mt-1 text-xs text-ice">{c.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
