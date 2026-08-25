"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AssetStatus, Alert } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEVERITY_TAG: Record<AssetStatus, string> = {
  ok: "NOMINAL",
  warn: "RISK ELEVATED",
  critical: "CRITICAL",
};

const SEVERITY_BORDER: Record<AssetStatus, string> = {
  ok: "border-l-ok",
  warn: "border-l-warn",
  critical: "border-l-critical",
};

export function AlertStack({ alerts }: { alerts: Alert[] }) {
  return (
    <aside className="pointer-events-none fixed bottom-4 right-4 z-[1000] flex w-[350px] flex-col gap-2">
      <p className="pl-1 font-mono text-[9px] tracking-[0.24em] text-muted-ink">
        EVENT LOG · {alerts.length}
      </p>
      <ScrollArea className="thin-scroll pointer-events-auto max-h-[52vh]">
        <div className="flex flex-col gap-2 pr-1">
          {alerts.map((alert) => {
            const sos = alert.sos === true;
            const severity: AssetStatus = sos ? "critical" : alert.severity;
            return (
              <article
                key={alert.id}
                className={cn(
                  "animate-alert-in pointer-events-auto rounded-md border border-white/8 border-l-2 bg-panel/95 px-3 py-2 backdrop-blur",
                  SEVERITY_BORDER[severity],
                  sos && "bg-critical/10 shadow-[0_0_18px_rgba(212,93,93,0.3)]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-ink">
                      {SEVERITY_TAG[severity]}
                    </span>
                    {sos && (
                      <Badge
                        variant="destructive"
                        className="h-4 rounded-sm px-1.5 font-mono text-[8px] uppercase tracking-[0.2em]"
                      >
                        PRIORITY
                      </Badge>
                    )}
                  </span>
                  <time className="font-mono text-[9px] tabular-nums text-muted-ink">
                    {alert.timestamp.slice(11, 19)}Z
                  </time>
                </div>
                <p className="mt-1 text-xs leading-snug text-ice">{alert.message}</p>
              </article>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
