export type StationId = "maitri" | "bharati";

export type AssetType = "fuel" | "cargo" | "personnel";

export type AssetStatus = "ok" | "warn" | "critical";

export interface Asset {
  id: string;
  station: StationId;
  type: AssetType;
  value: number;
  unit: string;
  status: AssetStatus;
}

export interface Alert {
  id: string;
  severity: AssetStatus;
  message: string;
  timestamp: string;
  sos?: boolean;
}

export interface TwinFrame {
  type: "state_update";
  assets: Record<string, Asset>;
  alerts: Alert[];
}

export interface StationMeta {
  id: StationId;
  name: string;
  lat: number;
  lon: number;
}

export const STATIONS: StationMeta[] = [
  { id: "maitri", name: "Maitri", lat: -70.7658, lon: 11.7333 },
  { id: "bharati", name: "Bharati", lat: -69.4076, lon: 76.1929 },
];
