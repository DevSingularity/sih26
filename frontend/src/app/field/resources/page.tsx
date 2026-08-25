"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { postJson } from "@/lib/api";

const RESOURCE_TYPES = [
  { id: "fuel", label: "FUEL", unit: "liters", placeholder: "e.g., 45" },
  { id: "power", label: "POWER", unit: "kWh", placeholder: "e.g., 120" },
  { id: "water", label: "WATER", unit: "liters", placeholder: "e.g., 200" },
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
    <div className="p-4 space-y-4">
      <h1 className="font-display text-lg font-bold tracking-[0.2em] text-ice uppercase">
        Resource Usage
      </h1>

      <div className="grid grid-cols-3 gap-2">
        {RESOURCE_TYPES.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r.id)}
            className={`rounded-lg border px-3 py-3 text-center transition-colors ${
              selected === r.id
                ? "border-ok/40 bg-ok/10 text-ok"
                : "border-white/8 bg-white/3 text-muted-ink hover:text-ice"
            }`}
          >
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase">{r.label}</span>
          </button>
        ))}
      </div>

      <Card className="border-white/8 bg-panel/60">
        <CardHeader>
          <CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">
            LOG {RESOURCE_TYPES.find((r) => r.id === selected)?.label} USAGE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder={RESOURCE_TYPES.find((r) => r.id === selected)?.placeholder}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-white/5 border-white/8 text-ice font-mono text-xs"
            />
            <span className="font-mono text-[9px] text-muted-ink shrink-0">
              {RESOURCE_TYPES.find((r) => r.id === selected)?.unit}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit} disabled={!amount} className="font-mono text-[9px] tracking-[0.2em] uppercase">
              LOG USAGE
            </Button>
            {submitted && (
              <Badge variant="outline" className="border-ok/40 bg-ok/10 text-ok font-mono text-[8px]">
                LOGGED ✓
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
