"use client";

import { createContext, useContext, useState } from "react";
import { AppNav } from "@/components/console/app-nav";
import { TopBar } from "@/components/console/top-bar";
import { useTwin } from "@/hooks/use-twin";
import type { StationId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StationCtx {
  station: StationId;
  setStation: (s: StationId) => void;
}

export const StationContext = createContext<StationCtx>({ station: "maitri", setStation: () => {} });

export function useStationContext() {
  return useContext(StationContext);
}

export default function StationLayout({ children }: { children: React.ReactNode }) {
  const twin = useTwin();
  const [station, setStation] = useState<StationId>("maitri");

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-deep">
      <TopBar
        connected={twin.connected}
        isOnline={twin.isOnline}
        onToggleOnline={twin.setIsOnline}
        onSos={() => {}}
      />
      <div className="flex h-full pt-14">
        <aside className="shrink-0 w-56 border-r border-white/10 bg-panel/92 backdrop-blur-xl">
          <div className="border-b border-white/10 p-3">
            <span className="font-mono text-[11px] tracking-[0.18em] text-muted-ink font-medium block mb-2">STATION</span>
            <div className="flex gap-1.5">
              {(["maitri", "bharati"] as StationId[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStation(s)}
                  className={cn(
                    "flex-1 rounded-lg px-2 py-2 font-mono text-[11px] tracking-[0.15em] uppercase font-medium transition-all duration-200",
                    station === s
                      ? "bg-ok/15 text-ok border border-ok/30 shadow-[0_0_12px_rgba(79,163,163,0.1)]"
                      : "text-muted-ink hover:text-ice border border-transparent hover:border-white/10 hover:bg-white/5",
                  )}
                >
                  {s === "maitri" ? "MAITRI" : "BHARATI"}
                </button>
              ))}
            </div>
          </div>
          <AppNav variant="station" />
        </aside>
        <main className="flex-1 overflow-auto thin-scroll">
          <StationContext.Provider value={{ station, setStation }}>
            {children}
          </StationContext.Provider>
        </main>
      </div>
    </div>
  );
}
