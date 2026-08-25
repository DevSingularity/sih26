"use client";

import { use } from "react";
import { useExpedition } from "@/hooks/use-expeditions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLS: Record<string, string> = {
  PLANNED: "border-accent-blue/40 bg-accent-blue/10 text-accent-blue",
  ACTIVE: "border-ok/40 bg-ok/10 text-ok",
  COMPLETED: "border-muted-ink/40 bg-muted-ink/10 text-muted-ink",
  CONFIRMED: "border-ok/40 bg-ok/10 text-ok",
  DELAYED: "border-warn/40 bg-warn/10 text-warn",
  CANCELLED: "border-critical/40 bg-critical/10 text-critical",
};

const CUSTODY_CLS = {
  INDENTED: "border-muted-ink/40 bg-muted-ink/10 text-muted-ink",
  DISPATCHED: "border-accent-blue/40 bg-accent-blue/10 text-accent-blue",
  IN_TRANSIT: "border-accent-amber/40 bg-accent-amber/10 text-accent-amber",
  INWARD: "border-ok/40 bg-ok/10 text-ok",
  ISSUED: "border-accent-purple/40 bg-accent-purple/10 text-accent-purple",
} as const;

export default function ExpeditionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { expedition, loading } = useExpedition(id);

  if (loading) return <div className="p-6 font-mono text-xs text-muted-ink">LOADING...</div>;
  if (!expedition) return <div className="p-6 font-mono text-xs text-muted-ink">EXPEDITION NOT FOUND</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
            {expedition.name}
          </h1>
          <p className="mt-1 font-mono text-[9px] tracking-[0.2em] text-muted-ink">
            {expedition.route.join(" → ").toUpperCase()}
          </p>
        </div>
        <Badge variant="outline" className={cn("h-5 rounded-sm px-2 font-mono text-[9px] tracking-[0.18em]", STATUS_CLS[expedition.status])}>
          {expedition.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">DETAILS</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between"><span className="font-mono text-[9px] text-muted-ink">START DATE</span><span className="font-mono text-[9px] text-ice">{expedition.startDate}</span></div>
            <div className="flex justify-between"><span className="font-mono text-[9px] text-muted-ink">CREATED BY</span><span className="font-mono text-[9px] text-ice">{expedition.createdBy}</span></div>
            <div className="flex justify-between"><span className="font-mono text-[9px] text-muted-ink">CARGO</span><span className="font-mono text-[9px] text-ice">{expedition.cargoRequirementSummary}</span></div>
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">PERSONNEL ({expedition.personnelAssigned.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {expedition.personnelAssigned.map((p) => (
              <div key={p} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-ok" />
                <span className="font-mono text-[9px] text-ice">{p}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-panel/60">
          <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">SHIPMENT LEGS</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {expedition.shipments.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border border-white/8 bg-white/3 px-3 py-2">
                <span className="font-mono text-[9px] text-ice">{s.routeLeg}</span>
                <Badge variant="outline" className={cn("h-4 rounded-sm px-1.5 font-mono text-[8px]", STATUS_CLS[s.status])}>
                  {s.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/8 bg-panel/60">
        <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">CARGO ITEMS ({expedition.cargo.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {expedition.cargo.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-white/8 bg-white/3 px-3 py-2">
                <div>
                  <span className="font-mono text-[9px] text-ice">{c.category}</span>
                  <span className="ml-2 font-mono text-[8px] text-muted-ink">{c.qrCode}</span>
                </div>
                <Badge variant="outline" className={cn("h-4 rounded-sm px-1.5 font-mono text-[8px]", CUSTODY_CLS[c.custodyState])}>
                  {c.custodyState}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
