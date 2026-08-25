"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface TopBarProps {
  connected: boolean;
  isOnline: boolean;
  onToggleOnline: (value: boolean) => void;
  onSos: () => void;
}

const LINK_STATES = {
  online: { label: "ONLINE", dot: "bg-ok", pill: "border-ok/40 bg-ok/10 text-ok" },
  offline: { label: "OFFLINE", dot: "bg-warn", pill: "border-warn/40 bg-warn/10 text-warn" },
  lost: { label: "LINK LOST", dot: "bg-critical", pill: "border-critical/40 bg-critical/10 text-critical" },
} as const;

function readUtcClock(): string {
  return new Date().toISOString().slice(11, 19);
}

export function TopBar({ connected, isOnline, onToggleOnline, onSos }: TopBarProps) {
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () => setClock(readUtcClock());
    const initial = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);

  const link = !connected ? LINK_STATES.lost : isOnline ? LINK_STATES.online : LINK_STATES.offline;

  return (
    <header className="fixed inset-x-0 top-0 z-[1000] flex h-12 items-center justify-between border-b border-white/8 bg-panel/95 px-4 backdrop-blur">
      <div className="flex flex-col justify-center leading-tight">
        <span className="font-display text-sm font-semibold tracking-[0.3em] text-ice">
          POLAROPS
        </span>
        <span className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">
          ANTARCTIC STATION TWIN // MAITRI · BHARATI
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs tabular-nums text-ice">
          {clock} <span className="text-muted-ink">UTC</span>
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2 py-0.5",
            link.pill,
          )}
        >
          <span className={cn("size-1.5 rounded-full", link.dot)} />
          <span className="font-mono text-[10px] tracking-[0.2em]">{link.label}</span>
        </span>
        <label className="flex items-center gap-2">
          <span className="font-mono text-[9px] tracking-[0.25em] text-muted-ink">LINK</span>
          <Switch
            checked={isOnline}
            onCheckedChange={onToggleOnline}
            aria-label="Toggle simulated field link"
          />
        </label>
        <Button
          variant="outline"
          onClick={onSos}
          className="h-8 rounded-md border-critical px-4 font-mono text-[11px] uppercase tracking-[0.3em] text-critical shadow-[0_0_14px_rgba(212,93,93,0.25)] hover:bg-critical/15 hover:text-critical dark:border-critical dark:bg-transparent dark:hover:bg-critical/15 focus-visible:ring-critical/40"
        >
          SOS
        </Button>
      </div>
    </header>
  );
}
