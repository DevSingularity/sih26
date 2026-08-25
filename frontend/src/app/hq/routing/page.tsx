"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Shield, Zap, Navigation } from "lucide-react";

const ROUTES = [
  {
    id: "route-001",
    name: "Primary — India → Cape Town → Maitri",
    status: "ACTIVE",
    recommended: true,
    eta: "72h remaining",
    risk: "Low",
    icon: Navigation,
    details: "Standard southern ocean route. Weather window favorable for next 48h. Fuel consumption nominal.",
  },
  {
    id: "route-002",
    name: "Emergency Divert — Direct to Bharati",
    status: "AVAILABLE",
    recommended: false,
    eta: "96h estimated",
    risk: "Medium",
    icon: Zap,
    details: "Bypasses Cape Town resupply. Higher risk due to direct southern crossing. Use only for critical personnel evacuation.",
  },
  {
    id: "route-003",
    name: "Resupply — Cape Town → Bharati",
    status: "PLANNED",
    recommended: true,
    eta: "Pending departure",
    risk: "Low",
    icon: Shield,
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
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
        Route Optimizer
      </h1>

      <div className="space-y-4">
        {ROUTES.map((route, i) => {
          const Icon = route.icon;
          return (
            <div key={route.id} className={cn("card-panel p-6 animate-fade-in", route.recommended && "border-ok/15")} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start gap-4">
                <div className={cn("rounded-xl p-3 shrink-0", route.recommended ? "bg-ok/10" : "bg-white/5")}>
                  <Icon className={cn("size-5", route.recommended ? "text-ok" : "text-muted-ink")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display text-base font-semibold tracking-[0.1em] text-ice">
                      {route.name}
                    </h3>
                    {route.recommended && (
                      <Badge className="h-5 rounded-md border-ok/40 bg-ok/10 px-2 font-mono text-[10px] tracking-[0.12em] text-ok font-medium">
                        RECOMMENDED
                      </Badge>
                    )}
                    <Badge variant="outline" className={cn("h-5 rounded-md px-2 font-mono text-[10px] tracking-[0.14em] font-medium", STATUS_CLS[route.status])}>
                      {route.status}
                    </Badge>
                  </div>
                  <p className="text-[13px] text-ice/70 mb-3">{route.details}</p>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="label-mono-sm">ETA</span>
                      <p className="value-mono text-[12px] mt-0.5">{route.eta}</p>
                    </div>
                    <div>
                      <span className="label-mono-sm">RISK</span>
                      <p className={cn("value-mono text-[12px] mt-0.5", route.risk === "Low" ? "text-ok" : "text-warn")}>{route.risk}</p>
                    </div>
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" className="font-mono text-[10px] tracking-[0.15em] uppercase h-8 px-4">
                      SELECT ROUTE
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
