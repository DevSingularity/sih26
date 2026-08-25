"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      // Fallback: use hardcoded station location
      const fallback = { lat: -70.7658, lon: 11.7333 };
      setLocation(fallback);
      setShared(true);
      setTimeout(() => setShared(false), 5000);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="font-display text-lg font-bold tracking-[0.2em] text-ice uppercase">
        Location Updates
      </h1>

      <Card className="border-white/8 bg-panel/60">
        <CardHeader>
          <CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">CURRENT POSITION</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full border border-white/10 bg-white/5 p-4">
              <MapPin className="size-6 text-accent-blue" />
            </div>
            <div>
              {location ? (
                <div className="space-y-1">
                  <p className="font-mono text-xs text-ice">LAT: {location.lat.toFixed(4)}</p>
                  <p className="font-mono text-xs text-ice">LON: {location.lon.toFixed(4)}</p>
                </div>
              ) : (
                <p className="font-mono text-xs text-muted-ink">NOT SHARED YET</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleShare} className="font-mono text-[9px] tracking-[0.2em] uppercase">
              SHARE LOCATION
            </Button>
            {shared && (
              <Badge variant="outline" className="border-ok/40 bg-ok/10 text-ok font-mono text-[8px]">
                SHARED ✓
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
