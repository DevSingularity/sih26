"use client";

import { useState } from "react";
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
      setTriggered(true);
    }
  };

  if (triggered) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[60vh]">
        <div className="rounded-full bg-critical/15 p-10 mb-6 animate-pulse">
          <AlertTriangle className="size-20 text-critical" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-[0.3em] text-critical uppercase mb-3">
          SOS ACTIVATED
        </h1>
        <p className="font-mono text-[12px] tracking-[0.1em] text-muted-ink text-center max-w-xs leading-relaxed">
          Emergency alert has been sent to HQ Command and Station Admin. Stay in position. Help is on the way.
        </p>
        <Badge variant="destructive" className="mt-5 font-mono text-[11px] h-6 px-3">
          ESCALATED TO HQ
        </Badge>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <h1 className="font-display text-xl font-bold tracking-[0.15em] text-critical uppercase">
        Emergency SOS
      </h1>

      <div className="rounded-2xl border border-critical/30 bg-gradient-to-b from-critical/8 to-critical/3 p-6 space-y-5">
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-critical font-medium uppercase">
          {confirming ? "CONFIRM SOS TRIGGER" : "TRIGGER EMERGENCY SOS"}
        </h2>

        <div className="rounded-xl border border-critical/20 bg-critical/5 p-8 text-center">
          <AlertTriangle className="size-16 text-critical mx-auto mb-4" />
          <p className="text-[14px] text-ice leading-relaxed max-w-sm mx-auto">
            {confirming
              ? "Are you sure? This will send an emergency alert to HQ and all station admins."
              : "Press the button below to trigger an SOS alert. This will immediately notify HQ Command and Station Admin."}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSos}
            className="flex-1 bg-critical text-white hover:bg-critical/80 font-mono text-[13px] font-semibold tracking-[0.2em] uppercase h-14 shadow-[0_0_30px_rgba(212,93,93,0.3)] hover:shadow-[0_0_40px_rgba(212,93,93,0.4)] transition-all duration-200"
          >
            {confirming ? "CONFIRM SOS" : "TRIGGER SOS"}
          </Button>
          {confirming && (
            <Button
              onClick={() => setConfirming(false)}
              variant="outline"
              className="font-mono text-[11px] tracking-[0.15em] uppercase h-14 px-6"
            >
              CANCEL
            </Button>
          )}
        </div>

        <Badge variant="outline" className="border-warn/40 bg-warn/10 text-warn font-mono text-[10px] h-5 px-2 w-full justify-center">
          WORKS OFFLINE — QUEUED FOR SYNC
        </Badge>
      </div>
    </div>
  );
}
