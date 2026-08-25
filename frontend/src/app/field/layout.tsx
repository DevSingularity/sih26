"use client";

import Link from "next/link";
import { TopBar } from "@/components/console/top-bar";
import { BottomTabBar } from "@/components/console/bottom-tab-bar";
import { useTwin } from "@/hooks/use-twin";
import { useEffect, useState } from "react";

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  const twin = useTwin();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkPending = () => {
      const stored = localStorage.getItem("field-outbox");
      if (stored) {
        try {
          const items = JSON.parse(stored);
          setPendingCount(items.filter((i: { status: string }) => i.status === "PENDING").length);
        } catch { setPendingCount(0); }
      }
    };
    checkPending();
    const timer = setInterval(checkPending, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto flex h-screen max-w-md flex-col overflow-hidden bg-deep">
      <div className="flex items-center justify-between border-b border-white/8 bg-panel/95 px-4 py-3">
        <Link href="/" className="font-mono text-[9px] tracking-[0.2em] text-muted-ink hover:text-ice transition-colors">
          ← SWITCH CONSOLE
        </Link>
        <span className="font-display text-xs font-semibold tracking-[0.3em] text-ice">
          FIELD APP
        </span>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 font-mono text-[8px] tracking-[0.14em] text-warn">
              {pendingCount} PENDING
            </span>
          )}
          <span className={`font-mono text-[8px] tracking-[0.14em] ${twin.connected ? "text-ok" : "text-critical"}`}>
            {twin.connected ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </div>
      <main className="flex-1 overflow-auto thin-scroll pb-16">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
