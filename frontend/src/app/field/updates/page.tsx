"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { postJson } from "@/lib/api";

export default function FieldUpdatesPage() {
  const [activity, setActivity] = useState("");
  const [conditions, setConditions] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isOnline] = useState(() => navigator.onLine);

  const handleSubmit = async () => {
    if (!activity) return;
    try {
      const operationId = crypto.randomUUID();
      if (isOnline) {
        await postJson("/field/updates", {
          station: "maitri",
          activity,
          siteConditions: conditions,
          notes,
          operationId,
        });
      } else {
        const outbox = JSON.parse(localStorage.getItem("field-outbox") ?? "[]");
        outbox.push({ id: operationId, type: "update", data: { station: "maitri", activity, siteConditions: conditions, notes }, status: "PENDING" });
        localStorage.setItem("field-outbox", JSON.stringify(outbox));
      }
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      setActivity("");
      setConditions("");
      setNotes("");
    } catch {
      // handle error
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="font-display text-lg font-bold tracking-[0.2em] text-ice uppercase">
        Field Updates
      </h1>

      <Card className="border-white/8 bg-panel/60">
        <CardHeader><CardTitle className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">NEW UPDATE</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Activity (e.g., Cargo offloading, Antenna maintenance)"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            className="bg-white/5 border-white/8 text-ice font-mono text-xs"
          />
          <Input
            placeholder="Site conditions (visibility, wind, temp)"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            className="bg-white/5 border-white/8 text-ice font-mono text-xs"
          />
          <Textarea
            placeholder="Additional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-white/5 border-white/8 text-ice font-mono text-xs"
          />
          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit} className="font-mono text-[9px] tracking-[0.2em] uppercase" disabled={!activity}>
              SUBMIT
            </Button>
            <Badge variant="outline" className={`font-mono text-[8px] ${isOnline ? "border-ok/40 bg-ok/10 text-ok" : "border-warn/40 bg-warn/10 text-warn"}`}>
              {isOnline ? "ONLINE" : "OFFLINE — WILL QUEUE"}
            </Badge>
            {submitted && (
              <Badge variant="outline" className="border-ok/40 bg-ok/10 text-ok font-mono text-[8px]">
                SUBMITTED ✓
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
