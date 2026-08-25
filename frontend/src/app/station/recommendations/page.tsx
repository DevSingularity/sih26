"use client";

import { useRecommendations } from "@/hooks/use-recommendations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_CLS = {
  PENDING: "border-accent-amber/40 bg-accent-amber/10 text-accent-amber",
  ACCEPTED: "border-ok/40 bg-ok/10 text-ok",
  DISMISSED: "border-muted-ink/40 bg-muted-ink/10 text-muted-ink",
} as const;

export default function StationRecommendationsPage() {
  const { recommendations, actOnRecommendation } = useRecommendations();

  return (
    <div className="p-6 space-y-6">
      <h1 className="font-display text-xl font-bold tracking-[0.2em] text-ice uppercase">
        AI Recommendations
      </h1>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <Card key={rec.id} className="border-white/8 bg-panel/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={cn("h-5 rounded-sm px-2 font-mono text-[8px] tracking-[0.18em]", STATUS_CLS[rec.status])}>
                    {rec.status}
                  </Badge>
                  <CardTitle className="font-mono text-[9px] tracking-[0.18em] text-muted-ink">
                    ALERT: {rec.riskAlertId}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-ice">{rec.suggestedAction}</p>
              {rec.status === "PENDING" && (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => actOnRecommendation(rec.id, "ACCEPTED")}
                    className="font-mono text-[8px] tracking-[0.2em] uppercase border-ok/40 text-ok hover:bg-ok/10"
                  >
                    ACCEPT
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => actOnRecommendation(rec.id, "DISMISSED")}
                    className="font-mono text-[8px] tracking-[0.2em] uppercase border-critical/40 text-critical hover:bg-critical/10"
                  >
                    DISMISS
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
