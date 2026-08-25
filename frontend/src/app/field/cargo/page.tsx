"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, Circle } from "lucide-react";

const STEPS = ["SCAN", "UNLOAD", "VERIFY", "CONFIRM"];

export default function FieldCargoPage() {
  const [step, setStep] = useState(0);
  const [qrCode, setQrCode] = useState("");

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleReset = () => {
    setStep(0);
    setQrCode("");
  };

  return (
    <div className="p-5 space-y-5">
      <h1 className="font-display text-xl font-bold tracking-[0.15em] text-ice uppercase">
        Cargo Handling
      </h1>

      {/* Step indicator */}
      <div className="card-panel p-4">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const isDone = i < step;
            const isCurrent = i === step;
            const isLast = i === STEPS.length - 1;
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    "size-7 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                    isDone ? "bg-ok border-ok shadow-[0_0_8px_rgba(79,163,163,0.3)]" : isCurrent ? "border-accent-blue bg-accent-blue/10" : "border-muted-ink/30"
                  )}>
                    {isDone ? <CheckCircle className="size-4 text-white" /> : <span className="font-mono text-[10px] text-muted-ink font-medium">{i + 1}</span>}
                  </div>
                  <span className={cn(
                    "font-mono text-[10px] tracking-[0.1em] font-medium",
                    isDone || isCurrent ? "text-ice" : "text-muted-ink/60"
                  )}>{s}</span>
                </div>
                {!isLast && (
                  <div className={cn("flex-1 h-0.5 mx-2 rounded-full", isDone ? "bg-ok" : "bg-muted-ink/15")} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="card-panel p-5 animate-fade-in" key={step}>
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="label-mono">STEP 1: SCAN CARGO</h3>
            <Input
              placeholder="Scan QR code or enter manually"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              className="bg-white/5 border-white/10 text-ice font-mono text-xs h-10"
            />
            <Button onClick={handleNext} disabled={!qrCode} className="font-mono text-[11px] tracking-[0.15em] uppercase h-9">
              SCAN COMPLETE
            </Button>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="label-mono">STEP 2: UNLOAD CARGO</h3>
            <div className="rounded-xl border border-white/8 bg-white/4 p-4">
              <span className="font-mono text-[11px] text-muted-ink">QR: {qrCode}</span>
              <p className="mt-1 text-[13px] text-ice">Check for damage, count items, confirm manifest.</p>
            </div>
            <Button onClick={handleNext} className="font-mono text-[11px] tracking-[0.15em] uppercase h-9">
              UNLOADING COMPLETE
            </Button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="label-mono">STEP 3: VERIFY CARGO</h3>
            <div className="space-y-2">
              {["Item 1 — Matches manifest", "Item 2 — Matches manifest", "Item 3 — Minor dent noted"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3">
                  {i < 2 ? <CheckCircle className="size-4 text-ok shrink-0" /> : <Circle className="size-4 text-warn shrink-0" />}
                  <span className="value-mono text-[12px]">{item}</span>
                </div>
              ))}
            </div>
            <Button onClick={handleNext} className="font-mono text-[11px] tracking-[0.15em] uppercase h-9">
              VERIFICATION COMPLETE
            </Button>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4 text-center py-4">
            <div className="rounded-2xl border border-ok/20 bg-ok/5 p-8">
              <Badge variant="outline" className="border-ok/40 bg-ok/10 text-ok font-mono text-[11px] h-6 px-3">
                CARGO CONFIRMED
              </Badge>
              <p className="mt-3 text-[13px] text-ice font-mono">QR: {qrCode}</p>
              <p className="mt-1 font-mono text-[11px] text-muted-ink">All items verified</p>
            </div>
            <Button onClick={handleReset} variant="outline" className="font-mono text-[11px] tracking-[0.15em] uppercase h-9">
              PROCESS NEXT ITEM
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
