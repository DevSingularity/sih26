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
    <nav className="fixed bottom-0 inset-x-0 z-[1000] flex items-stretch border-t border-white/8 bg-panel/95 backdrop-blur">
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
              "flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors",
              isSos
                ? isActive
                  ? "bg-critical/20 text-critical"
                  : "text-critical/60 hover:bg-critical/10 hover:text-critical"
                : isActive
                  ? "text-ok bg-ok/10"
                  : "text-muted-ink hover:text-ice",
            )}
          >
            <Icon className="size-5" />
            <span className="font-mono text-[8px] tracking-[0.2em] uppercase">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
