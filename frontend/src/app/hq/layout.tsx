"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/console/app-nav";
import { TopBar } from "@/components/console/top-bar";
import { useTwin } from "@/hooks/use-twin";

export default function HqLayout({ children }: { children: React.ReactNode }) {
  const twin = useTwin();
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
          <AppNav variant="hq" />
        </aside>
        <main className="flex-1 overflow-auto thin-scroll">
          {children}
        </main>
      </div>
    </div>
  );
}
