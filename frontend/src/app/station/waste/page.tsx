"use client";

import { useStationContext } from "@/app/station/layout";
import { useWaste } from "@/hooks/use-waste";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="p-6 space-y-6">
      <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
        {station.toUpperCase()} Waste & Compliance
      </h1>

      <Card className="border-white/8 bg-panel/60">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-4 py-3 text-left font-mono text-[9px] tracking-[0.22em] text-muted-ink">DATE</th>
                <th className="px-4 py-3 text-left font-mono text-[9px] tracking-[0.22em] text-muted-ink">CATEGORY</th>
                <th className="px-4 py-3 text-left font-mono text-[9px] tracking-[0.22em] text-muted-ink">QUANTITY (KG)</th>
                <th className="px-4 py-3 text-left font-mono text-[9px] tracking-[0.22em] text-muted-ink">METHOD</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-white/5 hover:bg-white/3">
                  <td className="px-4 py-2.5 font-mono text-[9px] text-muted-ink">{entry.loggedAt.slice(0, 10)}</td>
                  <td className="px-4 py-2.5 font-mono text-[9px] text-ice">{entry.category}</td>
                  <td className="px-4 py-2.5 font-mono text-[9px] text-ice">{entry.quantityKg}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className={cn("h-4 rounded-sm px-1.5 font-mono text-[8px]", METHOD_CLS[entry.method])}>
                      {entry.method}
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
