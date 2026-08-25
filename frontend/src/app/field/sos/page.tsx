"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { postJson } from "@/lib/api";

export default function FieldSosPage() {
  const [triggered, setTriggered] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleSos = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    try {
      const operationId = crypto.randomUUID();
      await postJson("/field/sos", { station: "maitri", operationId });
      setTriggered(true);
    } catch {
      // handle error
    }
  };

  if (triggered) {
    return (
      <div className="flex flex-col items-center justify-center p-4 min-h-[60vh]">
        <div className="rounded-full bg-critical/20 p-8 mb-4">
          <AlertTriangle className="size-16 text-critical animate-pulse" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-[0.3em] text-critical uppercase">
          SOS ACTIVATED
        </h1>
        <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-muted-ink text-center">
          Emergency alert has been sent to HQ Command and Station Admin.
          <br />
          Stay in position. Help is on the way.
        </p>
        <Badge variant="destructive" className="mt-4 font-mono text-[9px]">
          ESCALATED TO HQ
        </Badge>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="font-display text-lg font-bold tracking-[0.2em] text-critical uppercase">
        Emergency SOS
      </h1>

      <Card className="border-critical/30 bg-critical/5">
        <CardHeader>
          <CardTitle className="font-mono text-[9px] tracking-[0.22em] text-critical">
            {confirming ? "CONFIRM SOS TRIGGER" : "TRIGGER EMERGENCY SOS"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-critical/20 bg-critical/5 p-4 text-center">
            <AlertTriangle className="size-12 text-critical mx-auto mb-3" />
            <p className="text-sm text-ice">
              {confirming
                ? "Are you sure? This will send an emergency alert to HQ and all station admins."
                : "Press the button below to trigger an SOS alert. This will immediately notify HQ Command and Station Admin."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSos}
              className="flex-1 bg-critical text-white hover:bg-critical/80 font-mono text-[10px] tracking-[0.2em] uppercase py-6"
            >
              {confirming ? "CONFIRM SOS" : "TRIGGER SOS"}
            </Button>
            {confirming && (
              <Button
                onClick={() => setConfirming(false)}
                variant="outline"
                className="font-mono text-[9px] tracking-[0.2em] uppercase"
              >
                CANCEL
              </Button>
            )}
          </div>
          <Badge variant="outline" className="border-warn/40 bg-warn/10 text-warn font-mono text-[8px] w-full justify-center py-1">
            WORKS OFFLINE — QUEUED FOR SYNC
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
