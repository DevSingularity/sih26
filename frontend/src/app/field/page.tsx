"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MapPin, Activity, Package, Radio, AlertTriangle } from "lucide-react";

const ACTIONS = [
  { label: "LOG FIELD UPDATE", href: "/field/updates", desc: "Report activity, conditions, notes", icon: Activity },
  { label: "CARGO HANDLING", href: "/field/cargo", desc: "Scan, unload, verify cargo", icon: Package },
  { label: "RESOURCE USAGE", href: "/field/resources", desc: "Log fuel, power, equipment", icon: Radio },
  { label: "SHARE LOCATION", href: "/field/location", desc: "Update current position", icon: MapPin },
  { label: "SOS", href: "/field/sos", desc: "Emergency alert", icon: AlertTriangle, critical: true },
];

export default function FieldHome() {
  return (
    <div className="p-5 space-y-5">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-panel/80 to-panel/40 p-6 text-center backdrop-blur-md relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-ok/5 rounded-full blur-[60px]" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent-blue/5 rounded-full blur-[50px]" />
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase mb-1">
            Field Operations
          </h1>
          <p className="font-mono text-[11px] tracking-[0.12em] text-muted-ink">
            CHECK IN · HANDLE CARGO · LOG RESOURCES · SHARE LOCATION
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-panel p-4">
          <span className="label-mono-sm block mb-1">LAST SYNC</span>
          <p className="value-mono text-[12px]">{new Date().toISOString().slice(11, 19)} UTC</p>
        </div>
        <div className="card-panel p-4">
          <span className="label-mono-sm block mb-1">STATION</span>
          <Badge variant="outline" className="border-ok/40 bg-ok/10 text-ok font-mono text-[11px] h-5 px-2">
            MAITRI
          </Badge>
        </div>
      </div>

      <div className="space-y-2.5">
        <h2 className="label-mono">QUICK ACTIONS</h2>
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition-all duration-200 ${
                action.critical
                  ? "border-critical/25 bg-critical/5 hover:bg-critical/10 hover:border-critical/40 hover:shadow-[0_0_20px_rgba(212,93,93,0.1)]"
                  : "border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 hover:shadow-[0_2px_12px_rgba(0,0,0,0.2)]"
              }`}
            >
              <Icon className={`size-5 shrink-0 ${action.critical ? "text-critical" : "text-muted-ink"}`} />
              <div className="flex-1 min-w-0">
                <span className={`font-mono text-[12px] tracking-[0.15em] uppercase font-medium ${action.critical ? "text-critical" : "text-ice"}`}>
                  {action.label}
                </span>
                <p className="font-mono text-[10px] text-muted-ink mt-0.5">{action.desc}</p>
              </div>
              <span className={`font-mono text-[11px] shrink-0 ${action.critical ? "text-critical" : "text-muted-ink"}`}>→</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
