"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Route,
  Package,
  Radio,
  MessageSquare,
  Shield,
  Activity,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
}

const HQ_LINKS: NavLink[] = [
  { href: "/hq", label: "OVERVIEW", icon: LayoutDashboard },
  { href: "/hq/expeditions", label: "EXPEDITIONS", icon: Route },
  { href: "/hq/cargo", label: "CARGO", icon: Package },
  { href: "/hq/tracking", label: "TRACKING", icon: Radio },
  { href: "/hq/routing", label: "ROUTING", icon: Shield },
  { href: "/hq/comms", label: "COMMS", icon: MessageSquare },
];

const STATION_LINKS: NavLink[] = [
  { href: "/station", label: "DASHBOARD", icon: LayoutDashboard },
  { href: "/station/twin", label: "DIGITAL TWIN", icon: Activity },
  { href: "/station/cargo", label: "CARGO", icon: Package },
  { href: "/station/tracking", label: "TRACKING", icon: Radio },
  { href: "/station/resources", label: "RESOURCES", icon: Activity },
  { href: "/station/risk", label: "RISK & ALERTS", icon: Shield },
  { href: "/station/recommendations", label: "AI RECOMMEND", icon: Activity },
  { href: "/station/waste", label: "WASTE", icon: Activity },
  { href: "/station/sync", label: "SYNC STATUS", icon: Activity },
];

export function AppNav({ variant }: { variant: "hq" | "station" }) {
  const pathname = usePathname();
  const links = variant === "hq" ? HQ_LINKS : STATION_LINKS;

  return (
    <nav className="flex flex-col gap-1 p-2">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-md px-3 py-2 font-mono text-[9px] tracking-[0.22em] text-muted-ink hover:text-ice transition-colors mb-2"
      >
        <Home className="size-3" />
        SWITCH CONSOLE
      </Link>
      <div className="h-px bg-white/8 mb-2" />
      {links.map((link) => {
        const Icon = link.icon;
        const isActive =
          link.href === "/hq" || link.href === "/station"
            ? pathname === link.href
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 font-mono text-[10px] tracking-[0.22em] uppercase transition-colors",
              isActive
                ? "bg-ok/10 text-ok border-l-2 border-ok"
                : "text-muted-ink hover:text-ice hover:bg-white/5 border-l-2 border-transparent",
            )}
          >
            <Icon className="size-3.5" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
