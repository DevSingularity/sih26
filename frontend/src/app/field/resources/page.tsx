"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { postJson } from "@/lib/api";
import { Fuel, Zap, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

const RESOURCE_TYPES = [
  { id: "fuel", label: "FUEL", unit: "liters", placeholder: "e.g., 45", icon: Fuel },
  { id: "power", label: "POWER", unit: "kWh", placeholder: "e.g., 120", icon: Zap },
  { id: "water", label: "WATER", unit: "liters", placeholder: "e.g., 200", icon: Droplets },
];

export default function FieldResourcesPage() {
  const [selected, setSelected] = useState("fuel");
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!amount) return;
    try {
      const operationId = crypto.randomUUID();
      await postJson("/field/updates", {
        station: "maitri",
        activity: `Resource usage: ${selected} — ${amount} ${RESOURCE_TYPES.find((r) => r.id === selected)?.unit}`,
        siteConditions: navigator.onLine ? "Online" : "Offline",
        notes: "",
        operationId,
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      setAmount("");
    } catch {
      // handle error
    }
  };

  return (
    <div className="p-5 space-y-5">
      <h1 className="font-display text-xl font-bold tracking-[0.15em] text-ice uppercase">
        Resource Usage
      </h1>

      <div className="grid grid-cols-3 gap-2.5">
        {RESOURCE_TYPES.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 transition-all duration-200",
                selected === r.id
                  ? "border-ok/40 bg-ok/10 text-ok shadow-[0_0_16px_rgba(79,163,163,0.1)]"
                  : "border-white/8 bg-white/3 text-muted-ink hover:text-ice hover:border-white/15",
              )}
            >
              <Icon className="size-5" />
              <span className="font-mono text-[11px] tracking-[0.15em] uppercase font-medium">{r.label}</span>
            </button>
          );
        })}
      </div>

      <div className="card-panel p-5 space-y-4">
        <h2 className="label-mono">LOG {RESOURCE_TYPES.find((r) => r.id === selected)?.label.toUpperCase()} USAGE</h2>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            placeholder={RESOURCE_TYPES.find((r) => r.id === selected)?.placeholder}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-white/5 border-white/10 text-ice font-mono text-xs h-10 flex-1"
          />
          <span className="font-mono text-[11px] text-muted-ink shrink-0">
            {RESOURCE_TYPES.find((r) => r.id === selected)?.unit}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSubmit} disabled={!amount} className="font-mono text-[11px] tracking-[0.15em] uppercase h-9">
            LOG USAGE
          </Button>
          {submitted && (
            <Badge variant="outline" className="border-ok/40 bg-ok/10 text-ok font-mono text-[10px] h-5 px-2 animate-fade-in">
              LOGGED ✓
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
