"use client";

import { useState } from "react";
import { useExpeditions } from "@/hooks/use-expeditions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Expedition } from "@/lib/types";
import Link from "next/link";

const STATUS_CLS = {
  PLANNED: "border-accent-blue/40 bg-accent-blue/10 text-accent-blue",
  ACTIVE: "border-ok/40 bg-ok/10 text-ok",
  COMPLETED: "border-muted-ink/40 bg-muted-ink/10 text-muted-ink",
} as const;

export default function ExpeditionsPage() {
  const { expeditions, createExpedition } = useExpeditions();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [route, setRoute] = useState("");
  const [startDate, setStartDate] = useState("");
  const [summary, setSummary] = useState("");

  const handleCreate = async () => {
    if (!name || !route || !startDate) return;
    await createExpedition({
      name,
      route: route.split(",").map((s) => s.trim()),
      startDate,
      cargoRequirementSummary: summary,
    });
    setShowForm(false);
    setName("");
    setRoute("");
    setStartDate("");
    setSummary("");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
          Expeditions
        </h1>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="font-mono text-[9px] tracking-[0.2em] uppercase">
          {showForm ? "CANCEL" : "+ NEW EXPEDITION"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-white/8 bg-panel/60">
          <CardHeader>
            <CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">CREATE EXPEDITION</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Expedition name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/8 text-ice font-mono text-xs" />
            <Input placeholder="Route (comma-separated: india, cape-town, maitri)" value={route} onChange={(e) => setRoute(e.target.value)} className="bg-white/5 border-white/8 text-ice font-mono text-xs" />
            <Input type="date" placeholder="Start date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white/5 border-white/8 text-ice font-mono text-xs" />
            <Textarea placeholder="Cargo requirement summary" value={summary} onChange={(e) => setSummary(e.target.value)} className="bg-white/5 border-white/8 text-ice font-mono text-xs" />
            <Button onClick={handleCreate} className="font-mono text-[9px] tracking-[0.2em] uppercase">CREATE</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {expeditions.map((exp) => (
          <Link key={exp.id} href={`/hq/expeditions/${exp.id}`}>
            <Card className="border-white/8 bg-panel/60 hover:border-white/15 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-sm font-semibold tracking-[0.15em] text-ice">
                    {exp.name}
                  </CardTitle>
                  <Badge variant="outline" className={cn("h-5 rounded-sm px-2 font-mono text-[8px] tracking-[0.18em]", STATUS_CLS[exp.status])}>
                    {exp.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-xs text-muted-ink">
                  <span className="font-mono text-[9px]">ROUTE: {exp.route.join(" → ").toUpperCase()}</span>
                  <span className="font-mono text-[9px]">START: {exp.startDate}</span>
                  <span className="font-mono text-[9px]">CREATOR: {exp.createdBy}</span>
                </div>
                <p className="mt-2 font-mono text-[9px] text-muted-ink">{exp.cargoRequirementSummary}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
