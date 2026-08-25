"use client";

import { useState } from "react";
import { useCargo } from "@/hooks/use-cargo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CargoCustodyState } from "@/lib/types";

const CUSTODY_CLS: Record<CargoCustodyState, string> = {
  INDENTED: "border-muted-ink/40 bg-muted-ink/10 text-muted-ink",
  DISPATCHED: "border-accent-blue/40 bg-accent-blue/10 text-accent-blue",
  IN_TRANSIT: "border-accent-amber/40 bg-accent-amber/10 text-accent-amber",
  INWARD: "border-ok/40 bg-ok/10 text-ok",
  ISSUED: "border-accent-purple/40 bg-accent-purple/10 text-accent-purple",
};

const CUSTODY_OPTIONS: CargoCustodyState[] = ["INDENTED", "DISPATCHED", "IN_TRANSIT", "INWARD", "ISSUED"];

export default function HqCargoPage() {
  const { items } = useCargo();
  const [filter, setFilter] = useState<CargoCustodyState | "ALL">("ALL");

  const filtered = filter === "ALL" ? items : items.filter((c) => c.custodyState === filter);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
          Cargo Readiness
        </h1>
        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant={filter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("ALL")}
            className="font-mono text-[10px] tracking-[0.14em] uppercase h-8"
          >
            ALL ({items.length})
          </Button>
          {CUSTODY_OPTIONS.map((state) => (
            <Button
              key={state}
              variant={filter === state ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(state)}
              className="font-mono text-[10px] tracking-[0.1em] uppercase h-8"
            >
              {state} ({items.filter((c) => c.custodyState === state).length})
            </Button>
          ))}
        </div>
      </div>

      <div className="card-panel-static overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/3">
              <th className="px-5 py-3.5 text-left font-mono text-[10px] tracking-[0.18em] text-muted-ink font-medium">ID</th>
              <th className="px-5 py-3.5 text-left font-mono text-[10px] tracking-[0.18em] text-muted-ink font-medium">CATEGORY</th>
              <th className="px-5 py-3.5 text-left font-mono text-[10px] tracking-[0.18em] text-muted-ink font-medium">EXPEDITION</th>
              <th className="px-5 py-3.5 text-left font-mono text-[10px] tracking-[0.18em] text-muted-ink font-medium">LOCATION</th>
              <th className="px-5 py-3.5 text-left font-mono text-[10px] tracking-[0.18em] text-muted-ink font-medium">QR CODE</th>
              <th className="px-5 py-3.5 text-left font-mono text-[10px] tracking-[0.18em] text-muted-ink font-medium">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => (
              <tr key={item.id} className={cn("border-b border-white/5 table-row-hover", i % 2 === 0 ? "bg-white/2" : "")}>
                <td className="px-5 py-3 font-mono text-[11px] text-muted-ink">{item.id}</td>
                <td className="px-5 py-3 value-mono text-[11px]">{item.category}</td>
                <td className="px-5 py-3 font-mono text-[11px] text-muted-ink">{item.expeditionId}</td>
                <td className="px-5 py-3 value-mono text-[11px]">{item.currentLocation.toUpperCase()}</td>
                <td className="px-5 py-3 font-mono text-[11px] text-muted-ink">{item.qrCode}</td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className={cn("h-5 rounded-md px-2 font-mono text-[10px] tracking-[0.12em]", CUSTODY_CLS[item.custodyState])}>
                    {item.custodyState}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
