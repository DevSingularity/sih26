"use client";

import { useComms } from "@/hooks/use-comms";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function HqCommsPage() {
  const { entries } = useComms();

  return (
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
        Communication Log
      </h1>

      <div className="card-panel-static p-5">
        <h2 className="label-mono mb-4">HQ ↔ ANTARCTIC STATION THREAD</h2>
        <ScrollArea className="thin-scroll max-h-[calc(100vh-220px)]">
          <div className="space-y-4 pr-2">
            {entries.map((entry, i) => {
              const isHq = entry.direction === "HQ_TO_ADMIN";
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "rounded-xl border px-5 py-4 animate-fade-in transition-all duration-200 hover:border-white/15",
                    isHq
                      ? "border-accent-blue/15 bg-accent-blue/4 ml-8"
                      : "border-ok/15 bg-ok/4 mr-8",
                  )}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 rounded-md px-2.5 font-mono text-[10px] tracking-[0.12em] font-medium",
                        isHq
                          ? "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
                          : "border-ok/40 bg-ok/10 text-ok",
                      )}
                    >
                      {isHq ? "HQ → STATION" : "STATION → HQ"}
                    </Badge>
                    <time className="font-mono text-[10px] tabular-nums text-muted-ink">
                      {entry.timestamp.slice(0, 16).replace("T", " ")} UTC
                    </time>
                  </div>
                  <p className="text-[13px] leading-relaxed text-ice">{entry.message}</p>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
