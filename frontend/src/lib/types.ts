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

export interface Expedition {
  id: string;
  name: string;
  route: string[];
  startDate: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  createdBy: string;
  personnelAssigned: string[];
  cargoRequirementSummary: string;
}

export type CargoCustodyState = "INDENTED" | "DISPATCHED" | "IN_TRANSIT" | "INWARD" | "ISSUED";

export interface CargoItem {
  id: string;
  expeditionId: string;
  category: string;
  custodyState: CargoCustodyState;
  currentLocation: StationId | "cape-town" | "in-transit" | "india";
  qrCode: string;
}

export interface CargoMovementEvent {
  id: string;
  cargoItemId: string;
  fromLocation: string;
  toLocation: string;
  timestamp: string;
  recordedBy: string;
}

export interface InventorySnapshot {
  station: StationId;
  itemType: string;
  stockQty: number;
  consumptionRate: number;
  lastUpdated: string;
}

export interface ShipmentTrack {
  id: string;
  expeditionId: string;
  routeLeg: string;
  scheduledTime: string;
  status: "CONFIRMED" | "DELAYED" | "CANCELLED";
  etaHours: number;
}

export interface RiskAlert {
  id: string;
  type: "SUPPLY_RISK" | "PERSONNEL_RISK" | "COMMS_RISK";
  severity: AssetStatus;
  relatedEntity: string;
  station: StationId;
  message: string;
  raisedAt: string;
  resolvedAt: string | null;
}

export interface Recommendation {
  id: string;
  riskAlertId: string;
  suggestedAction: string;
  status: "PENDING" | "ACCEPTED" | "DISMISSED";
}

export interface CommsLogEntry {
  id: string;
  direction: "HQ_TO_ADMIN" | "ADMIN_TO_HQ";
  message: string;
  timestamp: string;
}

export interface WasteLogEntry {
  id: string;
  station: StationId;
  category: string;
  quantityKg: number;
  method: "INCINERATED" | "COMPACTED" | "RETURN_SHIPPED";
  loggedAt: string;
}

export interface SyncQueueItem {
  id: string;
  station: StationId;
  action: string;
  queuedAt: string;
  status: "PENDING" | "SYNCED" | "FAILED";
}

export interface FieldUpdateEntry {
  id: string;
  station: StationId;
  activity: string;
  siteConditions: string;
  notes: string;
  loggedAt: string;
  syncStatus: "PENDING" | "SYNCED";
}

export interface LocationUpdateEntry {
  id: string;
  station: StationId;
  lat: number;
  lon: number;
  sharedAt: string;
  syncStatus: "PENDING" | "SYNCED";
}

export interface SosEvent {
  id: string;
  station: StationId;
  triggeredAt: string;
  syncStatus: "PENDING" | "SYNCED";
  escalated: boolean;
}
