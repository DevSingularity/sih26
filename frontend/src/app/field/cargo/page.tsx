"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STEPS = ["SCAN", "UNLOAD", "VERIFY", "CONFIRM"];

export default function FieldCargoPage() {
  const [step, setStep] = useState(0);
  const [qrCode, setQrCode] = useState("");
  const [verified, setVerified] = useState(false);

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleReset = () => {
    setStep(0);
    setQrCode("");
    setVerified(false);
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="font-display text-lg font-bold tracking-[0.2em] text-ice uppercase">
        Cargo Handling
      </h1>

      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className={cn(
              "flex-1 h-1 rounded-full",
              i <= step ? "bg-ok" : "bg-white/10",
            )} />
            <span className={cn(
              "font-mono text-[7px] tracking-[0.14em]",
              i === step ? "text-ok" : i < step ? "text-ok/60" : "text-muted-ink",
            )}>
              {s}
            </span>
          </div>
        ))}
      </div>

      <Card className="border-white/8 bg-panel/60">
        <CardHeader>
          <CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">
            STEP {step + 1}: {STEPS[step]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <div className="space-y-3">
              <Input
                placeholder="Scan QR code or enter manually"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                className="bg-white/5 border-white/8 text-ice font-mono text-xs"
              />
              <Button onClick={handleNext} disabled={!qrCode} className="font-mono text-[9px] tracking-[0.2em] uppercase">
                SCAN COMPLETE
              </Button>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-ice">Unloading cargo from transport. Verify physical condition.</p>
              <div className="rounded-lg border border-white/8 bg-white/3 p-4">
                <span className="font-mono text-[9px] text-muted-ink">QR: {qrCode}</span>
                <p className="mt-1 text-sm text-ice">Check for damage, count items, confirm manifest.</p>
              </div>
              <Button onClick={handleNext} className="font-mono text-[9px] tracking-[0.2em] uppercase">
                UNLOADING COMPLETE
              </Button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-ice">Verify cargo against manifest.</p>
              <div className="space-y-2">
                {["Item 1 — Matches manifest", "Item 2 — Matches manifest", "Item 3 — Minor dent noted"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/3 px-3 py-2">
                    <div className={cn("size-2 rounded-full", i < 2 ? "bg-ok" : "bg-warn")} />
                    <span className="font-mono text-[9px] text-ice">{item}</span>
                  </div>
                ))}
              </div>
              <Button onClick={() => { setVerified(true); handleNext(); }} className="font-mono text-[9px] tracking-[0.2em] uppercase">
                VERIFICATION COMPLETE
              </Button>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-3 text-center">
              <div className="rounded-lg border border-ok/20 bg-ok/5 p-6">
                <Badge variant="outline" className="border-ok/40 bg-ok/10 text-ok font-mono text-[10px]">
                  CARGO CONFIRMED
                </Badge>
                <p className="mt-3 text-sm text-ice">QR: {qrCode}</p>
                <p className="font-mono text-[9px] text-muted-ink mt-1">
                  {verified ? "All items verified" : "Verification skipped"}
                </p>
              </div>
              <Button onClick={handleReset} variant="outline" className="font-mono text-[9px] tracking-[0.2em] uppercase">
                PROCESS NEXT ITEM
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
