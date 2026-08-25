"use client";

import { useState } from "react";
import { AppNav } from "@/components/console/app-nav";
import { TopBar } from "@/components/console/top-bar";
import { useTwin } from "@/hooks/use-twin";
import type { StationId } from "@/lib/types";
import { cn } from "@/lib/utils";

export function useStation() {
  const [station, setStation] = useState<StationId>("maitri");
  return { station, setStation };
}

export default function StationLayout({ children }: { children: React.ReactNode }) {
  const twin = useTwin();
  const [station, setStation] = useState<StationId>("maitri");
  const [navOpen, setNavOpen] = useState(true);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-deep">
      <TopBar
        connected={twin.connected}
        isOnline={twin.isOnline}
        onToggleOnline={twin.setIsOnline}
        onSos={() => {}}
      />
      <div className="flex h-full pt-12">
        <aside className={`shrink-0 border-r border-white/8 bg-panel/92 backdrop-blur transition-all duration-300 ${navOpen ? "w-56" : "w-0 overflow-hidden"}`}>
          <div className="border-b border-white/8 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">STATION</span>
            </div>
            <div className="mt-2 flex gap-1">
              {(["maitri", "bharati"] as StationId[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStation(s)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 font-mono text-[9px] tracking-[0.2em] uppercase transition-colors",
                    station === s
                      ? "bg-ok/15 text-ok border border-ok/30"
                      : "text-muted-ink hover:text-ice border border-transparent hover:border-white/8",
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

import { createContext, useContext } from "react";

interface StationCtx {
  station: StationId;
  setStation: (s: StationId) => void;
}

export const StationContext = createContext<StationCtx>({ station: "maitri", setStation: () => {} });

export function useStationContext() {
  return useContext(StationContext);
}
