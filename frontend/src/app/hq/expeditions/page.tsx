"use client";

import { useState } from "react";
import { useExpeditions } from "@/hooks/use-expeditions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STATUS_CLS: Record<string, string> = {
  PLANNED: "border-accent-blue/40 bg-accent-blue/10 text-accent-blue",
  ACTIVE: "border-ok/40 bg-ok/10 text-ok",
  COMPLETED: "border-muted-ink/40 bg-muted-ink/10 text-muted-ink",
};

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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
          Expeditions
        </h1>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="font-mono text-[11px] tracking-[0.15em] uppercase h-9 px-4">
          {showForm ? "CANCEL" : "+ NEW EXPEDITION"}
        </Button>
      </div>

      {showForm && (
        <div className="card-panel p-6 animate-slide-down">
          <h3 className="label-mono mb-4">CREATE EXPEDITION</h3>
          <div className="space-y-3">
            <Input placeholder="Expedition name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10 text-ice font-mono text-xs h-10" />
            <Input placeholder="Route (comma-separated: india, cape-town, maitri)" value={route} onChange={(e) => setRoute(e.target.value)} className="bg-white/5 border-white/10 text-ice font-mono text-xs h-10" />
            <Input type="date" placeholder="Start date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white/5 border-white/10 text-ice font-mono text-xs h-10" />
            <Textarea placeholder="Cargo requirement summary" value={summary} onChange={(e) => setSummary(e.target.value)} className="bg-white/5 border-white/10 text-ice font-mono text-xs min-h-[80px]" />
            <Button onClick={handleCreate} className="font-mono text-[11px] tracking-[0.15em] uppercase h-9">CREATE</Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {expeditions.map((exp, i) => (
          <Link key={exp.id} href={`/hq/expeditions/${exp.id}`}>
            <div
              className="card-panel p-5 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-base font-semibold tracking-[0.12em] text-ice">
                  {exp.name}
                </h3>
                <Badge variant="outline" className={cn("h-5 rounded-md px-2.5 font-mono text-[10px] tracking-[0.14em]", STATUS_CLS[exp.status])}>
                  {exp.status}
                </Badge>
              </div>
              <div className="flex items-center gap-5 text-muted-ink">
                <span className="font-mono text-[11px]">ROUTE: {exp.route.join(" → ").toUpperCase()}</span>
                <span className="font-mono text-[11px]">START: {exp.startDate}</span>
                <span className="font-mono text-[11px]">CREATOR: {exp.createdBy}</span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted-ink/80">{exp.cargoRequirementSummary}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
