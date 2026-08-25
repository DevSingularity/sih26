"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  STATIONS,
  type Asset,
  type AssetStatus,
  type AssetType,
  type StationId,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface StationRailProps {
  assets: Record<string, Asset>;
  isOnline: boolean;
  lastTickAt: number | null;
  pendingByStation: Record<StationId, number>;
  onLogCargo: (station: StationId) => void;
}

const STATUS_RANK: Record<AssetStatus, number> = { ok: 0, warn: 1, critical: 2 };

const WORST_META: Record<AssetStatus, { label: string; cls: string }> = {
  ok: { label: "NORMAL", cls: "border-ok/40 bg-ok/10 text-ok" },
  warn: { label: "ELEVATED", cls: "border-warn/40 bg-warn/10 text-warn" },
  critical: { label: "CRITICAL", cls: "border-critical/40 bg-critical/10 text-critical" },
};

const STATUS_TEXT: Record<AssetStatus, string> = {
  ok: "text-ok",
  warn: "text-warn",
  critical: "text-critical",
};

const TYPE_LABEL: Record<AssetType, string> = {
  fuel: "FUEL",
  cargo: "CARGO",
  personnel: "PERSONNEL",
};

function worstStatus(stationAssets: Asset[]): AssetStatus {
  return stationAssets.reduce<AssetStatus>(
    (worst, asset) => (STATUS_RANK[asset.status] > STATUS_RANK[worst] ? asset.status : worst),
    "ok",
  );
}

function formatValue(asset: Asset): string {
  return `${asset.value}${asset.unit === "%" ? "%" : ` ${asset.unit}`}`;
}

function formatTick(lastTickAt: number | null): string {
  if (lastTickAt === null) return "LAST SYNC --:--:--Z";
  return `LAST SYNC ${new Date(lastTickAt).toISOString().slice(11, 19)}Z`;
}

export function StationRail({
  assets,
  isOnline,
  lastTickAt,
  pendingByStation,
  onLogCargo,
}: StationRailProps) {
  const [open, setOpen] = useState(true);

  const byStation = useMemo(() => {
    const map = new Map<StationId, Asset[]>([
      ["maitri", []],
      ["bharati", []],
    ]);
    for (const asset of Object.values(assets)) {
      map.get(asset.station)?.push(asset);
    }
    return map;
  }, [assets]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        aria-hidden={!open}
        className={cn(
          "absolute bottom-0 left-0 top-12 z-[900] flex w-80 flex-col border-r border-white/8 bg-panel/92 backdrop-blur transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/8 pl-4 pr-2">
          <span className="font-mono text-[9px] tracking-[0.28em] text-muted-ink">
            STATIONS
          </span>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label="Collapse station rail">
              <ChevronLeft className="size-3.5" />
            </Button>
          </CollapsibleTrigger>
        </div>

        <ScrollArea className="thin-scroll min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-3">
            {STATIONS.map((station) => {
              const stationAssets = byStation.get(station.id) ?? [];
              const meta = WORST_META[worstStatus(stationAssets)];
              const pending = pendingByStation[station.id];
              const types = Object.keys(TYPE_LABEL) as AssetType[];
              return (
                <Card
                  key={station.id}
                  size="sm"
                  className="gap-0 rounded-md border border-white/8 bg-transparent py-3 ring-0"
                >
                  <CardHeader className="px-3">
                    <CardTitle className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-ice">
                      {station.name}
                    </CardTitle>
                    <CardAction>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 rounded-sm px-1.5 font-mono text-[9px] tracking-[0.18em]",
                          meta.cls,
                        )}
                      >
                        {meta.label}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1.5 px-3 pt-2">
                    {stationAssets.length === 0 ? (
                      <p className="font-mono text-[9px] tracking-[0.14em] text-muted-ink">
                        AWAITING TELEMETRY
                      </p>
                    ) : (
                      types.flatMap((type) =>
                        stationAssets
                          .filter((asset) => asset.type === type)
                          .map((asset) => (
                            <div
                              key={asset.id}
                              className="flex items-baseline justify-between"
                            >
                              <span className="font-mono text-[9px] tracking-[0.22em] text-muted-ink">
                                {TYPE_LABEL[type]}
                              </span>
                              <span
                                className={cn(
                                  "font-mono text-xs tabular-nums",
                                  STATUS_TEXT[asset.status],
                                )}
                              >
                                {formatValue(asset)}
                              </span>
                            </div>
                          )),
                      )
                    )}
                  </CardContent>
                  <Separator className="mt-3 bg-white/8" />
                  <CardFooter className="flex-col items-stretch gap-2 border-t-0 bg-transparent px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] tabular-nums tracking-[0.14em] text-muted-ink">
                        {isOnline ? formatTick(lastTickAt) : "OFFLINE — QUEUING"}
                      </span>
                      {pending > 0 && (
                        <Badge className="h-4 rounded-sm border border-warn/40 bg-warn/10 px-1.5 font-mono text-[9px] tracking-[0.14em] text-warn">
                          PENDING SYNC ({pending})
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="xs"
                      className="w-full rounded-md font-mono text-[9px] uppercase tracking-[0.22em]"
                      onClick={() => onLogCargo(station.id)}
                    >
                      LOG CARGO RECEIVED
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        <div className="shrink-0 border-t border-white/8 p-3">
          <p className="font-mono text-[9px] leading-relaxed tracking-[0.14em] text-muted-ink">
            RULE-BASED RISK ENGINE · SIMULATED TELEMETRY FEED · PHASE 1
          </p>
        </div>
      </div>

      <CollapsibleTrigger asChild>
        <button
          type="button"
          aria-label="Expand station rail"
          className={cn(
            "absolute left-0 top-16 z-[900] flex h-9 w-8 items-center justify-center rounded-r-md border border-l-0 border-white/8 bg-panel/92 text-muted-ink backdrop-blur transition-transform duration-300 hover:text-ice",
            open && "pointer-events-none -translate-x-full opacity-0",
          )}
        >
          <ChevronRight className="size-3.5" />
        </button>
      </CollapsibleTrigger>
    </Collapsible>
  );
}
