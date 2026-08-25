"use client";

import { useStationContext } from "@/app/station/layout";
import { useWaste } from "@/hooks/use-waste";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const METHOD_CLS = {
  INCINERATED: "border-warn/40 bg-warn/10 text-warn",
  COMPACTED: "border-accent-blue/40 bg-accent-blue/10 text-accent-blue",
  RETURN_SHIPPED: "border-accent-purple/40 bg-accent-purple/10 text-accent-purple",
} as const;

export default function StationWastePage() {
  const { station } = useStationContext();
  const { entries } = useWaste(station);

  return (
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
        {station.toUpperCase()} Waste & Compliance
      </h1>

      <div className="card-panel-static overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/3">
              <th className="px-5 py-3.5 text-left font-mono text-[10px] tracking-[0.18em] text-muted-ink font-medium">DATE</th>
              <th className="px-5 py-3.5 text-left font-mono text-[10px] tracking-[0.18em] text-muted-ink font-medium">CATEGORY</th>
              <th className="px-5 py-3.5 text-left font-mono text-[10px] tracking-[0.18em] text-muted-ink font-medium">QUANTITY (KG)</th>
              <th className="px-5 py-3.5 text-left font-mono text-[10px] tracking-[0.18em] text-muted-ink font-medium">METHOD</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={entry.id} className={cn("border-b border-white/5 table-row-hover", i % 2 === 0 ? "bg-white/2" : "")}>
                <td className="px-5 py-3 font-mono text-[11px] text-muted-ink">{entry.loggedAt.slice(0, 10)}</td>
                <td className="px-5 py-3 value-mono text-[12px]">{entry.category}</td>
                <td className="px-5 py-3 value-mono text-[12px]">{entry.quantityKg}</td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className={cn("h-5 rounded-md px-2 font-mono text-[10px]", METHOD_CLS[entry.method])}>
                    {entry.method}
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
