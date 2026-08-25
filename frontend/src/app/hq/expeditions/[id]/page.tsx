"use client";

import { use } from "react";
import { useExpedition } from "@/hooks/use-expeditions";
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

const CUSTODY_CLS: Record<string, string> = {
  INDENTED: "border-muted-ink/40 bg-muted-ink/10 text-muted-ink",
  DISPATCHED: "border-accent-blue/40 bg-accent-blue/10 text-accent-blue",
  IN_TRANSIT: "border-accent-amber/40 bg-accent-amber/10 text-accent-amber",
  INWARD: "border-ok/40 bg-ok/10 text-ok",
  ISSUED: "border-accent-purple/40 bg-accent-purple/10 text-accent-purple",
};

export default function ExpeditionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { expedition, loading } = useExpedition(id);

  if (loading) return <div className="p-8 space-y-4"><div className="skeleton h-8 w-48" /><div className="skeleton h-4 w-32" /></div>;
  if (!expedition) return <div className="p-8 font-mono text-sm text-muted-ink">Expedition not found</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
            {expedition.name}
          </h1>
          <p className="mt-1 font-mono text-[11px] tracking-[0.15em] text-muted-ink">
            {expedition.route.join(" → ").toUpperCase()}
          </p>
        </div>
        <Badge variant="outline" className={cn("h-6 rounded-md px-3 font-mono text-[11px] tracking-[0.14em] font-medium", STATUS_CLS[expedition.status])}>
          {expedition.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-panel-static p-5">
          <h3 className="label-mono mb-3">DETAILS</h3>
          <div className="space-y-2.5">
            {[["START DATE", expedition.startDate], ["CREATED BY", expedition.createdBy], ["CARGO", expedition.cargoRequirementSummary]].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between gap-2">
                <span className="label-mono-sm">{String(label)}</span>
                <span className="value-mono text-right text-[11px]">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-panel-static p-5">
          <h3 className="label-mono mb-3">PERSONNEL ({expedition.personnelAssigned.length})</h3>
          <div className="space-y-2">
            {expedition.personnelAssigned.map((p) => (
              <div key={p} className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-ok shrink-0" />
                <span className="value-mono text-[11px]">{p}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-panel-static p-5">
          <h3 className="label-mono mb-3">SHIPMENT LEGS</h3>
          <div className="space-y-2">
            {expedition.shipments.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/4 px-3 py-2.5">
                <span className="value-mono text-[11px]">{s.routeLeg}</span>
                <Badge variant="outline" className={cn("h-5 rounded-md px-2 font-mono text-[10px]", STATUS_CLS[s.status])}>
                  {s.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-panel-static p-5">
        <h3 className="label-mono mb-4">CARGO ITEMS ({expedition.cargo.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {expedition.cargo.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/4 px-4 py-3 table-row-hover">
              <div className="flex items-center gap-3">
                <span className="value-mono text-[11px]">{c.category}</span>
                <span className="font-mono text-[10px] text-muted-ink">{c.qrCode}</span>
              </div>
              <Badge variant="outline" className={cn("h-5 rounded-md px-2 font-mono text-[10px]", CUSTODY_CLS[c.custodyState])}>
                {c.custodyState}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
