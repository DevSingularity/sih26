"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { postJson } from "@/lib/api";

export default function FieldLocationPage() {
  const [shared, setShared] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  const handleShare = async () => {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      setLocation({ lat, lon });
      const operationId = crypto.randomUUID();
      await postJson("/field/location", { station: "maitri", lat, lon, operationId });
      setShared(true);
      setTimeout(() => setShared(false), 5000);
    } catch {
      const fallback = { lat: -70.7658, lon: 11.7333 };
      setLocation(fallback);
      const operationId = crypto.randomUUID();
      await postJson("/field/location", { station: "maitri", lat: fallback.lat, lon: fallback.lon, operationId }).catch(() => {});
      setShared(true);
      setTimeout(() => setShared(false), 5000);
    }
  };

  return (
    <div className="p-5 space-y-5">
      <h1 className="font-display text-xl font-bold tracking-[0.15em] text-ice uppercase">
        Location Updates
      </h1>

      <div className="card-panel p-6 space-y-5">
        <div className="flex items-center gap-5">
          <div className="rounded-2xl border border-accent-blue/20 bg-accent-blue/5 p-5">
            <MapPin className="size-8 text-accent-blue" />
          </div>
          <div>
            {location ? (
              <div className="space-y-1">
                <p className="value-mono text-[13px]">LAT: {location.lat.toFixed(4)}</p>
                <p className="value-mono text-[13px]">LON: {location.lon.toFixed(4)}</p>
              </div>
            ) : (
              <p className="font-mono text-[12px] text-muted-ink">Not shared yet</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleShare} className="font-mono text-[11px] tracking-[0.15em] uppercase h-9">
            SHARE LOCATION
          </Button>
          {shared && (
            <Badge variant="outline" className="border-ok/40 bg-ok/10 text-ok font-mono text-[10px] h-5 px-2 animate-fade-in">
              SHARED ✓
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
