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
    <nav className="flex flex-col gap-0.5 p-3">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono text-[11px] tracking-[0.16em] text-muted-ink hover:text-ice hover:bg-white/5 transition-all duration-200 mb-1"
      >
        <Home className="size-4" />
        SWITCH CONSOLE
      </Link>
      <div className="h-px bg-white/10 my-1" />
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
              "flex items-center gap-2.5 rounded-lg px-3 py-2 font-mono text-[11px] tracking-[0.15em] uppercase transition-all duration-200",
              isActive
                ? "bg-ok/12 text-ok border-l-[3px] border-ok shadow-[inset_0_0_12px_rgba(79,163,163,0.08)]"
                : "text-muted-ink hover:text-ice hover:bg-white/5 border-l-[3px] border-transparent",
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
