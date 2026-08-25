"use client";

import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { STATIONS, type Asset, type AssetStatus, type AssetType } from "@/lib/types";

const STATUS_COLOR: Record<AssetStatus, string> = {
  ok: "#4FA3A3",
  warn: "#E0A64A",
  critical: "#D45D5D",
};

const TYPE_LETTER: Record<AssetType, string> = {
  fuel: "F",
  cargo: "C",
  personnel: "P",
};

const TYPE_OFFSET: Record<AssetType, [number, number]> = {
  fuel: [28, -18],
  cargo: [30, 14],
  personnel: [-26, 16],
};

const Z_INDEX_OFFSET: Record<AssetStatus, number> = {
  critical: 800,
  warn: 400,
  ok: 0,
};

function stationIcon(name: string) {
  return L.divIcon({
    className: "",
    iconSize: [110, 30],
    iconAnchor: [55, 25],
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="margin-bottom:4px;white-space:nowrap;background:rgba(18,24,34,0.85);border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:2px 6px;font-family:var(--font-display);font-weight:600;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#C9D6DD;">${name}</div>
      <div style="width:8px;height:8px;border-radius:9999px;background:#C9D6DD;box-shadow:0 0 0 2px rgba(201,214,221,0.25);"></div>
    </div>`,
  });
}

function assetIcon(type: AssetType, status: AssetStatus) {
  const [dx, dy] = TYPE_OFFSET[type];
  const color = STATUS_COLOR[status];
  const pulse =
    status === "ok"
      ? ""
      : `<span class="${status === "warn" ? "pulse-warn" : "pulse-critical"}"></span>`;
  return L.divIcon({
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8 - dx, 8 - dy],
    html: `<div style="position:relative;width:16px;height:16px;">
      <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:${color};color:#0B0F14;font-family:var(--font-mono);font-size:8px;line-height:1;">${TYPE_LETTER[type]}</span>${pulse}
    </div>`,
  });
}

function formatTooltip(asset: Asset): string {
  return `${asset.type.toUpperCase()} ${asset.value}${asset.unit === "%" ? "%" : ` ${asset.unit}`}`;
}

export default function PolarMap({ assets }: { assets: Record<string, Asset> }) {
  const stationMarkers = useMemo(
    () =>
      STATIONS.map((station) => (
        <Marker
          key={station.id}
          position={[station.lat, station.lon]}
          icon={stationIcon(station.name.toUpperCase())}
          zIndexOffset={200}
        />
      )),
    [],
  );

  const assetMarkers = useMemo(
    () =>
      Object.entries(assets).flatMap(([id, asset]) => {
        const station = STATIONS.find((s) => s.id === asset.station);
        if (!station) return [];
        return [
          <Marker
            key={id}
            position={[station.lat, station.lon]}
            icon={assetIcon(asset.type, asset.status)}
            zIndexOffset={Z_INDEX_OFFSET[asset.status]}
          >
            <Tooltip permanent direction="top" offset={[0, -8]} opacity={1} className="polar-tip">
              {formatTooltip(asset)}
            </Tooltip>
          </Marker>,
        ];
      }),
    [assets],
  );

  return (
    <MapContainer
      center={[-70.1, 44]}
      zoom={3}
      zoomControl={false}
      style={{ position: "absolute", inset: 0 }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap contributors &copy; CARTO"
      />
      {stationMarkers}
      {assetMarkers}
    </MapContainer>
  );
}
