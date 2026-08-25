"use client";

import { useStationContext } from "@/app/station/layout";
import { useTracking } from "@/hooks/use-tracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLS = {
  CONFIRMED: "border-ok/40 bg-ok/10 text-ok",
  DELAYED: "border-warn/40 bg-warn/10 text-warn",
  CANCELLED: "border-critical/40 bg-critical/10 text-critical",
} as const;

export default function StationTrackingPage() {
  const { station } = useStationContext();
  const { tracks } = useTracking();

  return (
    <div className="p-6 space-y-6">
      <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
        {station.toUpperCase()} Incoming Shipments
      </h1>

      <div className="space-y-4">
        {tracks.map((track) => (
          <Card key={track.id} className="border-white/8 bg-panel/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-sm font-semibold tracking-[0.15em] text-ice">
                  {track.routeLeg}
                </CardTitle>
                <Badge variant="outline" className={cn("h-5 rounded-sm px-2 font-mono text-[8px] tracking-[0.18em]", STATUS_CLS[track.status])}>
                  {track.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {["DEPARTURE", "IN TRANSIT", "ARRIVAL"].map((wp, i) => {
                        const isCompleted = track.status === "CONFIRMED" && i < 2;
                        const isCurrent = track.status === "DELAYED" && i === 1;
                        return (
                          <div key={wp} className="flex items-center gap-1">
                            <div className={cn(
                              "size-3 rounded-full border-2",
                              isCompleted ? "bg-ok border-ok" : isCurrent ? "bg-warn border-warn" : "border-muted-ink/40 bg-transparent"
                            )} />
                            {i < 2 && <div className={cn("w-12 h-0.5", isCompleted ? "bg-ok" : "bg-muted-ink/20")} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4">
                    <span className="font-mono text-[9px] text-muted-ink">SCHEDULED: {track.scheduledTime.slice(0, 16).replace("T", " ")} UTC</span>
                    {track.etaHours > 0 && (
                      <span className="font-mono text-[9px] text-warn">ETA: {track.etaHours}h</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
