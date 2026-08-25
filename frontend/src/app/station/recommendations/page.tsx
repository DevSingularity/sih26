"use client";

import { useRecommendations } from "@/hooks/use-recommendations";
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
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-ice uppercase">
        AI Recommendations
      </h1>

      <div className="space-y-4">
        {recommendations.map((rec, i) => (
          <div key={rec.id} className={cn(
            "card-panel p-5 animate-fade-in",
            rec.status === "PENDING" && "border-accent-amber/15",
          )} style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className={cn("h-5 rounded-md px-2.5 font-mono text-[10px] tracking-[0.14em] font-medium", STATUS_CLS[rec.status])}>
                {rec.status}
              </Badge>
              <span className="label-mono-sm">ALERT: {rec.riskAlertId}</span>
            </div>
            <p className="text-[13px] text-ice leading-snug mb-3">{rec.suggestedAction}</p>
            {rec.status === "PENDING" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => actOnRecommendation(rec.id, "ACCEPTED")}
                  className="font-mono text-[10px] tracking-[0.15em] uppercase h-8 px-4 border-ok/40 text-ok hover:bg-ok/10"
                >
                  ACCEPT
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => actOnRecommendation(rec.id, "DISMISSED")}
                  className="font-mono text-[10px] tracking-[0.15em] uppercase h-8 px-4 border-critical/40 text-critical hover:bg-critical/10"
                >
                  DISMISS
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
