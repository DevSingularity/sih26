"use client";

import { useStationContext } from "@/app/station/layout";
import { useTracking } from "@/hooks/use-tracking";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLS = {
  CONFIRMED: "border-ok/40 bg-ok/10 text-ok",
  DELAYED: "border-warn/40 bg-warn/10 text-warn",
  CANCELLED: "border-critical/40 bg-critical/10 text-critical",
} as const;

const WAYPOINTS = ["DEPARTURE", "IN TRANSIT", "ARRIVAL"];

export default function StationTrackingPage() {
  const { station } = useStationContext();
  const { tracks } = useTracking();

  return (
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
        {station.toUpperCase()} Incoming Shipments
      </h1>

      <div className="space-y-4">
        {tracks.map((track, i) => (
          <div key={track.id} className="card-panel p-6 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold tracking-[0.12em] text-ice">
                {track.routeLeg}
              </h3>
              <Badge variant="outline" className={cn("h-5 rounded-md px-2.5 font-mono text-[10px] tracking-[0.14em] font-medium", STATUS_CLS[track.status])}>
                {track.status}
              </Badge>
            </div>

            <div className="flex items-center gap-0 mb-4">
              {WAYPOINTS.map((wp, idx) => {
                const isCompleted = track.status === "CONFIRMED" && idx < 2;
                const isCurrent = track.status === "DELAYED" && idx === 1;
                const isLast = idx === WAYPOINTS.length - 1;
                return (
                  <div key={wp} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={cn(
                        "size-4 rounded-full border-2 transition-all duration-300",
                        isCompleted ? "bg-ok border-ok shadow-[0_0_8px_rgba(79,163,163,0.4)]" : isCurrent ? "bg-warn border-warn shadow-[0_0_8px_rgba(224,166,74,0.4)]" : "border-muted-ink/30 bg-transparent"
                      )} />
                      <span className={cn(
                        "font-mono text-[10px] tracking-[0.1em] font-medium",
                        isCompleted || isCurrent ? "text-ice" : "text-muted-ink/60"
                      )}>{wp}</span>
                    </div>
                    {!isLast && (
                      <div className={cn("flex-1 h-0.5 mx-2 rounded-full", isCompleted ? "bg-ok" : "bg-muted-ink/15")} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-6">
              <span className="font-mono text-[11px] text-muted-ink">SCHEDULED: {track.scheduledTime.slice(0, 16).replace("T", " ")} UTC</span>
              {track.etaHours > 0 && (
                <span className="font-mono text-[11px] text-warn font-medium">ETA: {track.etaHours}h</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
