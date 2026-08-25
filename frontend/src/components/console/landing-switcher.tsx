"use client";

import Link from "next/link";
import { Radio, MapPin, Compass } from "lucide-react";

const CARDS = [
  {
    title: "HQ Command",
    description: "Indian Command Center — expedition planning, cargo readiness, shipment tracking, route decisions, and comms to Antarctica.",
    href: "/hq",
    icon: Radio,
    accent: "text-accent-blue",
    border: "hover:border-accent-blue/40",
    glow: "hover:shadow-[0_0_30px_rgba(79,127,224,0.15)]",
  },
  {
    title: "Station Ops",
    description: "Antarctic Station Admin — digital twin, inventory, resources, risk alerts, recommendations, and sync management.",
    href: "/station",
    icon: MapPin,
    accent: "text-ok",
    border: "hover:border-ok/40",
    glow: "hover:shadow-[0_0_30px_rgba(79,163,163,0.15)]",
  },
  {
    title: "Field App",
    description: "Field Personnel PWA — mobile-optimized check-ins, cargo handling, resource usage, location updates, and SOS.",
    href: "/field",
    icon: Compass,
    accent: "text-accent-amber",
    border: "hover:border-accent-amber/40",
    glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]",
  },
];

export function LandingSwitcher() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-deep">
      <div className="flex flex-col items-center gap-8 px-4">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-[0.4em] text-ice uppercase">
            POLAROPS
          </h1>
          <p className="mt-2 font-mono text-[10px] tracking-[0.25em] text-muted-ink uppercase">
            Antarctic Station Operations System
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={`group flex flex-col items-center gap-4 rounded-xl border border-white/8 bg-panel/80 p-8 text-center backdrop-blur transition-all duration-300 ${card.border} ${card.glow}`}
              >
                <div className={`rounded-full border border-white/10 bg-white/5 p-4 ${card.accent} transition-colors group-hover:bg-white/10`}>
                  <Icon className="size-8" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-[0.2em] text-ice uppercase">
                    {card.title}
                  </h2>
                  <p className="mt-2 font-mono text-[9px] leading-relaxed tracking-[0.14em] text-muted-ink">
                    {card.description}
                  </p>
                </div>
                <span className="font-mono text-[9px] tracking-[0.3em] text-muted-ink group-hover:text-ice transition-colors">
                  ENTER →
                </span>
              </Link>
            );
          })}
        </div>
        <p className="font-mono text-[9px] tracking-[0.14em] text-muted-ink/50">
          NO AUTHENTICATION REQUIRED — DEMO MODE
        </p>
      </div>
    </div>
  );
}
