"use client";

import { useStationContext } from "@/app/station/layout";
import { useRiskAlerts } from "@/hooks/use-risk-alerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="p-6 space-y-6">
      <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
        {station.toUpperCase()} Risk & Alerts
      </h1>

      <div className="space-y-3">
        {stationAlerts.length === 0 ? (
          <Card className="border-white/8 bg-panel/60">
            <CardContent className="p-6 text-center">
              <p className="font-mono text-xs text-muted-ink">NO RISK ALERTS FOR {station.toUpperCase()}</p>
            </CardContent>
          </Card>
        ) : (
          stationAlerts.map((alert) => (
            <Card key={alert.id} className={cn("border-white/8 bg-panel/60", alert.severity === "critical" && "border-critical/20")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn("h-5 rounded-sm px-2 font-mono text-[8px] tracking-[0.18em]", STATUS_CLS[alert.severity])}>
                      {SEVERITY_LABEL[alert.severity]}
                    </Badge>
                    <CardTitle className="font-mono text-[9px] tracking-[0.18em] text-muted-ink">
                      {alert.type}
                    </CardTitle>
                  </div>
                  <time className="font-mono text-[8px] tabular-nums text-muted-ink">
                    {alert.raisedAt.slice(0, 16).replace("T", " ")} UTC
                  </time>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ice">{alert.message}</p>
                {alert.resolvedAt && (
                  <p className="mt-2 font-mono text-[9px] text-ok">RESOLVED: {alert.resolvedAt.slice(0, 16).replace("T", " ")} UTC</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
