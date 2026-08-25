"use client";

import dynamic from "next/dynamic";
import { AlertStack } from "@/components/console/alert-stack";
import { StationRail } from "@/components/console/station-rail";
import { TopBar } from "@/components/console/top-bar";
import { useTwin } from "@/hooks/use-twin";
import type { Asset, StationId } from "@/lib/types";

const PolarMap = dynamic(() => import("@/components/map/polar-map"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-deep" />,
});

const STATUS_RANK = { ok: 0, warn: 1, critical: 2 } as const;

function worstScore(assets: Record<string, Asset>, station: StationId): number {
  let score = 0;
  for (const asset of Object.values(assets)) {
    if (asset.station !== station) continue;
    score = Math.max(score, STATUS_RANK[asset.status]);
  }
  return score;
}

function pickPriorityStation(assets: Record<string, Asset>): StationId {
  const maitri = worstScore(assets, "maitri");
  const bharati = worstScore(assets, "bharati");
  return maitri >= bharati ? "maitri" : "bharati";
}

export default function Page() {
  const twin = useTwin();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-deep">
      <PolarMap assets={twin.assets} />
      <TopBar
        connected={twin.connected}
        isOnline={twin.isOnline}
        onToggleOnline={twin.setIsOnline}
        onSos={() => twin.triggerSos(pickPriorityStation(twin.assets))}
      />
      <StationRail
        assets={twin.assets}
        isOnline={twin.isOnline}
        lastTickAt={twin.lastTickAt}
        pendingByStation={twin.pendingByStation}
        onLogCargo={twin.logCargo}
      />
      <AlertStack alerts={twin.displayAlerts} />
    </div>
  );
}
