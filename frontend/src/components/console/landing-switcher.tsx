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
    border: "hover:border-accent-blue/30",
    glow: "hover:shadow-[0_0_40px_rgba(79,127,224,0.12)]",
    iconBg: "bg-accent-blue/10 border-accent-blue/20",
  },
  {
    title: "Station Ops",
    description: "Antarctic Station Admin — digital twin, inventory, resources, risk alerts, recommendations, and sync management.",
    href: "/station",
    icon: MapPin,
    accent: "text-ok",
    border: "hover:border-ok/30",
    glow: "hover:shadow-[0_0_40px_rgba(79,163,163,0.12)]",
    iconBg: "bg-ok/10 border-ok/20",
  },
  {
    title: "Field App",
    description: "Field Personnel PWA — mobile-optimized check-ins, cargo handling, resource usage, location updates, and SOS.",
    href: "/field",
    icon: Compass,
    accent: "text-accent-amber",
    border: "hover:border-accent-amber/30",
    glow: "hover:shadow-[0_0_40px_rgba(245,158,11,0.12)]",
    iconBg: "bg-accent-amber/10 border-accent-amber/20",
  },
];

export function LandingSwitcher() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-deep relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-blue/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-ok/3 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-purple/2 rounded-full blur-[150px]" />
      </div>

      <div className="flex flex-col items-center gap-10 px-4 relative z-10">
        <div className="text-center">
          <h1 className="font-display text-5xl font-bold tracking-[0.5em] text-ice uppercase mb-3">
            POLAROPS
          </h1>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-white/20" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-muted-ink uppercase">
              Antarctic Station Operations
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-white/20" />
          </div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-muted-ink/60 uppercase">
            Mission Control System v2.0
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl w-full">
          {CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={`group flex flex-col items-center gap-5 rounded-2xl border border-white/8 bg-panel/70 p-10 text-center backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${card.border} ${card.glow} animate-fade-in`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`rounded-2xl border p-5 transition-all duration-300 group-hover:scale-110 ${card.iconBg}`}>
                  <Icon className={`size-10 ${card.accent}`} />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase mb-3">
                    {card.title}
                  </h2>
                  <p className="font-mono text-[11px] leading-relaxed tracking-[0.08em] text-muted-ink">
                    {card.description}
                  </p>
                </div>
                <span className="font-mono text-[11px] tracking-[0.25em] text-muted-ink group-hover:text-ice transition-all duration-200 mt-auto">
                  ENTER <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            );
          })}
        </div>

        <p className="font-mono text-[11px] tracking-[0.2em] text-muted-ink/40 uppercase">
          No authentication required — Demo Mode
        </p>
      </div>
    </div>
  );
}
