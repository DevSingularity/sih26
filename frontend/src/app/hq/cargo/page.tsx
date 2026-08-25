"use client";

import { useState } from "react";
import { useCargo } from "@/hooks/use-cargo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { items, loading } = useCargo();
  const [filter, setFilter] = useState<CargoCustodyState | "ALL">("ALL");

  const filtered = filter === "ALL" ? items : items.filter((c) => c.custodyState === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
          Cargo Readiness
        </h1>
        <div className="flex gap-1">
          <Button
            variant={filter === "ALL" ? "default" : "outline"}
            size="xs"
            onClick={() => setFilter("ALL")}
            className="font-mono text-[8px] tracking-[0.2em] uppercase"
          >
            ALL ({items.length})
          </Button>
          {CUSTODY_OPTIONS.map((state) => (
            <Button
              key={state}
              variant={filter === state ? "default" : "outline"}
              size="xs"
              onClick={() => setFilter(state)}
              className="font-mono text-[8px] tracking-[0.14em] uppercase"
            >
              {state} ({items.filter((c) => c.custodyState === state).length})
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-white/8 bg-panel/60">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-4 py-3 text-left font-mono text-[9px] tracking-[0.22em] text-muted-ink">ID</th>
                <th className="px-4 py-3 text-left font-mono text-[9px] tracking-[0.22em] text-muted-ink">CATEGORY</th>
                <th className="px-4 py-3 text-left font-mono text-[9px] tracking-[0.22em] text-muted-ink">EXPEDITION</th>
                <th className="px-4 py-3 text-left font-mono text-[9px] tracking-[0.22em] text-muted-ink">LOCATION</th>
                <th className="px-4 py-3 text-left font-mono text-[9px] tracking-[0.22em] text-muted-ink">QR CODE</th>
                <th className="px-4 py-3 text-left font-mono text-[9px] tracking-[0.22em] text-muted-ink">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/3">
                  <td className="px-4 py-2.5 font-mono text-[9px] text-muted-ink">{item.id}</td>
                  <td className="px-4 py-2.5 font-mono text-[9px] text-ice">{item.category}</td>
                  <td className="px-4 py-2.5 font-mono text-[9px] text-muted-ink">{item.expeditionId}</td>
                  <td className="px-4 py-2.5 font-mono text-[9px] text-ice">{item.currentLocation.toUpperCase()}</td>
                  <td className="px-4 py-2.5 font-mono text-[9px] text-muted-ink">{item.qrCode}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className={cn("h-4 rounded-sm px-1.5 font-mono text-[8px] tracking-[0.14em]", CUSTODY_CLS[item.custodyState])}>
                      {item.custodyState}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
