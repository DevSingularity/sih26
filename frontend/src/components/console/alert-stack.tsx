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
    <aside className="pointer-events-none fixed bottom-4 right-4 z-[1000] flex w-[380px] flex-col gap-2.5">
      <p className="pl-1 font-mono text-[11px] tracking-[0.2em] text-muted-ink font-medium">
        EVENT LOG · {alerts.length}
      </p>
      <ScrollArea className="thin-scroll pointer-events-auto max-h-[52vh]">
        <div className="flex flex-col gap-2.5 pr-1">
          {alerts.map((alert) => {
            const sos = alert.sos === true;
            const severity: AssetStatus = sos ? "critical" : alert.severity;
            return (
              <article
                key={alert.id}
                className={cn(
                  "animate-alert-in pointer-events-auto rounded-xl border border-white/10 border-l-[3px] bg-panel/95 px-4 py-3 backdrop-blur-md shadow-lg",
                  SEVERITY_BORDER[severity],
                  sos && "bg-critical/8 shadow-[0_0_24px_rgba(212,93,93,0.2)]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-ink font-medium">
                      {SEVERITY_TAG[severity]}
                    </span>
                    {sos && (
                      <Badge
                        variant="destructive"
                        className="h-5 rounded-md px-2 font-mono text-[10px] uppercase tracking-[0.15em] font-semibold"
                      >
                        PRIORITY
                      </Badge>
                    )}
                  </span>
                  <time className="font-mono text-[10px] tabular-nums text-muted-ink">
                    {alert.timestamp.slice(11, 19)}Z
                  </time>
                </div>
                <p className="mt-1.5 text-[13px] leading-snug text-ice">{alert.message}</p>
              </article>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
