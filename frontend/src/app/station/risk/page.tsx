"use client";

import { useStationContext } from "@/app/station/layout";
import { useRiskAlerts } from "@/hooks/use-risk-alerts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLS = {
  ok: "border-ok/40 bg-ok/10 text-ok",
  warn: "border-warn/40 bg-warn/10 text-warn",
  critical: "border-critical/40 bg-critical/10 text-critical",
} as const;

const SEVERITY_LABEL = { ok: "NOMINAL", warn: "ELEVATED", critical: "CRITICAL" } as const;

export default function StationRiskPage() {
  const { station } = useStationContext();
  const { alerts } = useRiskAlerts();

  const stationAlerts = alerts.filter((a) => a.station === station);

  return (
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
        {station.toUpperCase()} Risk & Alerts
      </h1>

      <div className="space-y-4">
        {stationAlerts.length === 0 ? (
          <div className="card-panel p-8 text-center">
            <p className="font-mono text-sm text-muted-ink">No risk alerts for {station.toUpperCase()}</p>
          </div>
        ) : (
          stationAlerts.map((alert, i) => (
            <div key={alert.id} className={cn(
              "card-panel p-5 animate-fade-in",
              alert.severity === "critical" && "border-critical/20 shadow-[0_0_20px_rgba(212,93,93,0.08)]",
              alert.severity === "warn" && "border-warn/15",
            )} style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={cn("h-5 rounded-md px-2.5 font-mono text-[10px] tracking-[0.14em] font-medium", STATUS_CLS[alert.severity])}>
                    {SEVERITY_LABEL[alert.severity]}
                  </Badge>
                  <span className="label-mono-sm">{alert.type}</span>
                </div>
                <time className="font-mono text-[10px] tabular-nums text-muted-ink">
                  {alert.raisedAt.slice(0, 16).replace("T", " ")} UTC
                </time>
              </div>
              <p className="text-[13px] text-ice leading-snug">{alert.message}</p>
              {alert.resolvedAt && (
                <p className="mt-2 font-mono text-[11px] text-ok">RESOLVED: {alert.resolvedAt.slice(0, 16).replace("T", " ")} UTC</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
