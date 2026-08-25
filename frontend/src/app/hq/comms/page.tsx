"use client";

import { useComms } from "@/hooks/use-comms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function HqCommsPage() {
  const { entries, loading } = useComms();

  return (
    <div className="p-6 space-y-6">
      <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
        Communication Log
      </h1>

      <Card className="border-white/8 bg-panel/60">
        <CardHeader>
          <CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">
            HQ ↔ ANTARCTIC STATION THREAD
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.map((entry) => {
            const isHq = entry.direction === "HQ_TO_ADMIN";
            return (
              <div
                key={entry.id}
                className={cn(
                  "rounded-md border px-4 py-3",
                  isHq
                    ? "border-accent-blue/20 bg-accent-blue/5 ml-8"
                    : "border-ok/20 bg-ok/5 mr-8",
                )}
              >
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 rounded-sm px-1.5 font-mono text-[8px] tracking-[0.14em]",
                      isHq
                        ? "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
                        : "border-ok/40 bg-ok/10 text-ok",
                    )}
                  >
                    {isHQ(entry) ? "HQ → STATION" : "STATION → HQ"}
                  </Badge>
                  <time className="font-mono text-[8px] tabular-nums text-muted-ink">
                    {entry.timestamp.slice(0, 16).replace("T", " ")} UTC
                  </time>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ice">{entry.message}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function isHQ(entry: { direction: string }): boolean {
  return entry.direction === "HQ_TO_ADMIN";
}
