"use client";

import Link from "next/link";
import { BottomTabBar } from "@/components/console/bottom-tab-bar";
import { useEffect, useState } from "react";

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
      <div className="flex items-center justify-between border-b border-white/10 bg-panel/95 px-5 py-3.5 backdrop-blur-xl">
        <Link href="/" className="font-mono text-[11px] tracking-[0.15em] text-muted-ink hover:text-ice transition-colors duration-200 font-medium">
          ← SWITCH
        </Link>
        <span className="font-display text-xs font-bold tracking-[0.3em] text-ice uppercase">
          FIELD APP
        </span>
        <div className="flex items-center gap-2.5">
          {pendingCount > 0 && (
            <span className="rounded-full border border-warn/40 bg-warn/10 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-warn font-medium">
              {pendingCount} PENDING
            </span>
          )}
          <span className={`flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] font-medium ${isOnline ? "text-ok" : "text-critical"}`}>
            <span className={`size-1.5 rounded-full ${isOnline ? "bg-ok" : "bg-critical"}`} />
            {isOnline ? "ONLINE" : "OFFLINE"}
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
