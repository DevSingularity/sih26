"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROUTES = [
  {
    id: "route-001",
    name: "Primary — India → Cape Town → Maitri",
    status: "ACTIVE",
    recommended: true,
    eta: "72h remaining",
    risk: "Low",
    details: "Standard southern ocean route. Weather window favorable for next 48h. Fuel consumption nominal.",
  },
  {
    id: "route-002",
    name: "Emergency Divert — Direct to Bharati",
    status: "AVAILABLE",
    recommended: false,
    eta: "96h estimated",
    risk: "Medium",
    details: "Bypasses Cape Town resupply. Higher risk due to direct southern crossing. Use only for critical personnel evacuation.",
  },
  {
    id: "route-003",
    name: "Resupply — Cape Town → Bharati",
    status: "PLANNED",
    recommended: true,
    eta: "Pending departure",
    risk: "Low",
    details: "Fuel bladder resupply for Bharati station. Pre-positioned at Cape Town depot. Awaiting weather clearance.",
  },
];

const STATUS_CLS: Record<string, string> = {
  ACTIVE: "border-ok/40 bg-ok/10 text-ok",
  AVAILABLE: "border-accent-blue/40 bg-accent-blue/10 text-accent-blue",
  PLANNED: "border-muted-ink/40 bg-muted-ink/10 text-muted-ink",
};

export default function HqRoutingPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
        Route Optimizer
      </h1>

      <div className="space-y-4">
        {ROUTES.map((route) => (
          <Card key={route.id} className={cn("border-white/8 bg-panel/60", route.recommended && "border-ok/20")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="font-display text-sm font-semibold tracking-[0.15em] text-ice">
                    {route.name}
                  </CardTitle>
                  {route.recommended && (
                    <Badge className="h-4 rounded-sm border-ok/40 bg-ok/10 px-1.5 font-mono text-[8px] tracking-[0.14em] text-ok">
                      RECOMMENDED
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className={cn("h-5 rounded-sm px-2 font-mono text-[8px] tracking-[0.18em]", STATUS_CLS[route.status])}>
                  {route.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-ice/80">{route.details}</p>
              <div className="flex items-center gap-6">
                <div>
                  <span className="font-mono text-[9px] text-muted-ink">ETA</span>
                  <p className="font-mono text-xs text-ice">{route.eta}</p>
                </div>
                <div>
                  <span className="font-mono text-[9px] text-muted-ink">RISK</span>
                  <p className={cn("font-mono text-xs", route.risk === "Low" ? "text-ok" : "text-warn")}>{route.risk}</p>
                </div>
                <div className="flex-1" />
                <Button variant="outline" size="xs" className="font-mono text-[8px] tracking-[0.2em] uppercase">
                  SELECT ROUTE
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
