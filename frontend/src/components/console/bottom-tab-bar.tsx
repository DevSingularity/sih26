"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Package, Activity, Radio, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabLink {
  href: string;
  label: string;
  icon: React.ElementType;
  accent?: string;
}

const TABS: TabLink[] = [
  { href: "/field", label: "Home", icon: MapPin },
  { href: "/field/updates", label: "Updates", icon: Activity },
  { href: "/field/cargo", label: "Cargo", icon: Package },
  { href: "/field/resources", label: "Resources", icon: Radio },
  { href: "/field/location", label: "Location", icon: Radio },
  { href: "/field/sos", label: "SOS", icon: AlertTriangle, accent: "text-critical" },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-[1000] flex items-stretch border-t border-white/10 bg-panel/98 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.href === "/field"
            ? pathname === "/field"
            : pathname.startsWith(tab.href);
        const isSos = tab.href === "/field/sos";
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1.5 py-3 transition-all duration-200 relative",
              isSos
                ? isActive
                  ? "bg-critical/15 text-critical"
                  : "text-critical/60 hover:bg-critical/8 hover:text-critical"
                : isActive
                  ? "text-ok"
                  : "text-muted-ink hover:text-ice",
            )}
          >
            {isActive && !isSos && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-ok" />
            )}
            {isActive && isSos && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-critical" />
            )}
            <Icon className="size-5" strokeWidth={isActive ? 2.5 : 1.5} />
            <span className="font-mono text-[10px] tracking-[0.12em] font-medium">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
