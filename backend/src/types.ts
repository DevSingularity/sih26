export type StationId = "maitri" | "bharati";
export type AssetType = "fuel" | "cargo" | "personnel";
export type Status = "ok" | "warn" | "critical";

export interface Station {
  name: string;
  lat: number;
  lon: number;
}

export interface Asset {
  id: string;
  station: StationId;
  type: AssetType;
  value: number;
  unit: string;
  status: Status;
}

export interface Alert {
  id: string;
  severity: "ok" | "warn" | "critical";
  message: string;
  timestamp: string;
  sos?: boolean;
}

export interface StateUpdate {
  type: "state_update";
  assets: Record<string, Asset>;
  alerts: Alert[];
}
