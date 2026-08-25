"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function FieldHome() {
  return (
    <div className="p-4 space-y-4">
      <div className="rounded-xl border border-white/8 bg-panel/60 p-4 text-center">
        <h1 className="font-display text-lg font-bold tracking-[0.2em] text-ice uppercase">
          Field Operations
        </h1>
        <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-muted-ink">
          CHECK IN • HANDLE CARGO • LOG RESOURCES • SHARE LOCATION
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">LAST SYNC</CardTitle></CardHeader>
          <CardContent>
            <p className="font-mono text-xs text-ice">{new Date().toISOString().slice(11, 19)} UTC</p>
          </CardContent>
        </Card>
        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">STATION</CardTitle></CardHeader>
          <CardContent>
            <Badge variant="outline" className="border-ok/40 bg-ok/10 text-ok font-mono text-[9px]">
              MAITRI
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">QUICK ACTIONS</h2>
        {[
          { label: "LOG FIELD UPDATE", href: "/field/updates", desc: "Report activity, conditions, notes" },
          { label: "CARGO HANDLING", href: "/field/cargo", desc: "Scan, unload, verify cargo" },
          { label: "RESOURCE USAGE", href: "/field/resources", desc: "Log fuel, power, equipment" },
          { label: "SHARE LOCATION", href: "/field/location", desc: "Update current position" },
          { label: "SOS", href: "/field/sos", desc: "Emergency alert", critical: true },
        ].map((action) => (
          <a
            key={action.href}
            href={action.href}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
              action.critical
                ? "border-critical/30 bg-critical/5 hover:bg-critical/10"
                : "border-white/8 bg-white/3 hover:bg-white/5"
            }`}
          >
            <div>
              <span className={`font-mono text-[10px] tracking-[0.2em] uppercase ${action.critical ? "text-critical" : "text-ice"}`}>
                {action.label}
              </span>
              <p className="font-mono text-[8px] text-muted-ink mt-0.5">{action.desc}</p>
            </div>
            <span className={`font-mono text-[9px] ${action.critical ? "text-critical" : "text-muted-ink"}`}>→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
