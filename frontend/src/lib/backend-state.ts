import type {
  Alert,
  Asset,
  CargoItem,
  CargoMovementEvent,
  CommsLogEntry,
  Expedition,
  FieldUpdateEntry,
  InventorySnapshot,
  LocationUpdateEntry,
  Recommendation,
  RiskAlert,
  SosEvent,
  StationId,
  SyncQueueItem,
  WasteLogEntry,
  CargoCustodyState,
} from "@/lib/types";

export const stations: Record<StationId, { name: string; lat: number; lon: number }> = {
  maitri: { name: "Maitri", lat: -70.7658, lon: 11.7333 },
  bharati: { name: "Bharati", lat: -69.4076, lon: 76.1929 },
};

export const assets: Record<string, Asset> = {
  "maitri-fuel-1": { id: "maitri-fuel-1", station: "maitri", type: "fuel", value: 68, unit: "%", status: "ok" },
  "maitri-cargo-1": { id: "maitri-cargo-1", station: "maitri", type: "cargo", value: 12, unit: "crates", status: "ok" },
  "maitri-crew-1": { id: "maitri-crew-1", station: "maitri", type: "personnel", value: 23, unit: "on-site", status: "ok" },
  "bharati-fuel-1": { id: "bharati-fuel-1", station: "bharati", type: "fuel", value: 41, unit: "%", status: "ok" },
  "bharati-cargo-1": { id: "bharati-cargo-1", station: "bharati", type: "cargo", value: 8, unit: "crates", status: "ok" },
  "bharati-crew-1": { id: "bharati-crew-1", station: "bharati", type: "personnel", value: 19, unit: "on-site", status: "ok" },
};

export const alerts: Alert[] = [];

export const expeditions: Expedition[] = [
  {
    id: "exp-001",
    name: "Dakshin Ganga 2026",
    route: ["india", "cape-town", "maitri"],
    startDate: "2026-07-15",
    status: "ACTIVE",
    createdBy: "Cmdr. Vikram Mehta",
    personnelAssigned: ["Dr. Priya Sharma", "Lt. Arjun Nair", "Eng. Meera Iyer", "Tech. Rohan Das", "Med. Ananya Patel", "Dr. Sanjay Gupta"],
    cargoRequirementSummary: "180 crates, 3 vehicles, fuel resupply — 42 tonnes total",
  },
  {
    id: "exp-002",
    name: "Bharati Winter Resupply",
    route: ["india", "cape-town", "bharati"],
    startDate: "2026-09-01",
    status: "PLANNED",
    createdBy: "Cmdr. Vikram Mehta",
    personnelAssigned: ["Dr. Neha Kapoor", "Eng. Ravi Menon", "Tech. Kiran Bhat"],
    cargoRequirementSummary: "95 crates, medical supplies, 2 vehicles — 28 tonnes total",
  },
];

export const cargoItems: CargoItem[] = [
  { id: "cargo-001", expeditionId: "exp-001", category: "Fuel Bladders", custodyState: "IN_TRANSIT", currentLocation: "in-transit", qrCode: "QR-FB-001" },
  { id: "cargo-002", expeditionId: "exp-001", category: "Food Stores", custodyState: "DISPATCHED", currentLocation: "cape-town", qrCode: "QR-FS-002" },
  { id: "cargo-003", expeditionId: "exp-001", category: "Scientific Instruments", custodyState: "INWARD", currentLocation: "maitri", qrCode: "QR-SI-003" },
  { id: "cargo-004", expeditionId: "exp-001", category: "Medical Supplies", custodyState: "ISSUED", currentLocation: "maitri", qrCode: "QR-MS-004" },
  { id: "cargo-005", expeditionId: "exp-001", category: "Spare Parts", custodyState: "IN_TRANSIT", currentLocation: "in-transit", qrCode: "QR-SP-005" },
  { id: "cargo-006", expeditionId: "exp-002", category: "Construction Materials", custodyState: "INDENTED", currentLocation: "india", qrCode: "QR-CM-006" },
  { id: "cargo-007", expeditionId: "exp-002", category: "Communication Gear", custodyState: "INDENTED", currentLocation: "india", qrCode: "QR-CG-007" },
  { id: "cargo-008", expeditionId: "exp-001", category: "Vehicles (Snow)", custodyState: "IN_TRANSIT", currentLocation: "in-transit", qrCode: "QR-VS-008" },
  { id: "cargo-009", expeditionId: "exp-002", category: "Fuel Bladders", custodyState: "INDENTED", currentLocation: "india", qrCode: "QR-FB-009" },
  { id: "cargo-010", expeditionId: "exp-001", category: "Camp Equipment", custodyState: "DISPATCHED", currentLocation: "cape-town", qrCode: "QR-CE-010" },
];

export const cargoMovementEvents: CargoMovementEvent[] = [
  { id: "evt-001", cargoItemId: "cargo-001", fromLocation: "india", toLocation: "cape-town", timestamp: "2026-08-01T06:00:00Z", recordedBy: "Logistics Officer Ravi" },
  { id: "evt-002", cargoItemId: "cargo-001", fromLocation: "cape-town", toLocation: "in-transit", timestamp: "2026-08-10T08:30:00Z", recordedBy: "Ship Captain" },
  { id: "evt-003", cargoItemId: "cargo-003", fromLocation: "india", toLocation: "cape-town", timestamp: "2026-07-20T10:00:00Z", recordedBy: "Logistics Officer Ravi" },
  { id: "evt-004", cargoItemId: "cargo-003", fromLocation: "cape-town", toLocation: "maitri", timestamp: "2026-08-05T14:15:00Z", recordedBy: "Station Admin" },
  { id: "evt-005", cargoItemId: "cargo-004", fromLocation: "india", toLocation: "cape-town", timestamp: "2026-07-18T09:00:00Z", recordedBy: "Logistics Officer Ravi" },
  { id: "evt-006", cargoItemId: "cargo-004", fromLocation: "cape-town", toLocation: "maitri", timestamp: "2026-08-02T11:45:00Z", recordedBy: "Station Admin" },
  { id: "evt-007", cargoItemId: "cargo-004", fromLocation: "maitri", toLocation: "maitri", timestamp: "2026-08-08T09:20:00Z", recordedBy: "Med. Ananya Patel" },
  { id: "evt-008", cargoItemId: "cargo-002", fromLocation: "india", toLocation: "cape-town", timestamp: "2026-08-03T07:00:00Z", recordedBy: "Logistics Officer Ravi" },
];

export const inventorySnapshots: InventorySnapshot[] = [
  { station: "maitri", itemType: "Fuel", stockQty: 68, consumptionRate: 2.1, lastUpdated: "2026-08-26T08:00:00Z" },
  { station: "maitri", itemType: "Food Stores", stockQty: 840, consumptionRate: 15, lastUpdated: "2026-08-26T08:00:00Z" },
  { station: "maitri", itemType: "Medical Supplies", stockQty: 120, consumptionRate: 1.2, lastUpdated: "2026-08-26T08:00:00Z" },
  { station: "maitri", itemType: "Spare Parts", stockQty: 45, consumptionRate: 0.8, lastUpdated: "2026-08-26T08:00:00Z" },
  { station: "maitri", itemType: "Drinking Water", stockQty: 2400, consumptionRate: 28, lastUpdated: "2026-08-26T08:00:00Z" },
  { station: "bharati", itemType: "Fuel", stockQty: 41, consumptionRate: 1.8, lastUpdated: "2026-08-26T08:00:00Z" },
  { station: "bharati", itemType: "Food Stores", stockQty: 620, consumptionRate: 12, lastUpdated: "2026-08-26T08:00:00Z" },
  { station: "bharati", itemType: "Medical Supplies", stockQty: 90, consumptionRate: 1.0, lastUpdated: "2026-08-26T08:00:00Z" },
  { station: "bharati", itemType: "Spare Parts", stockQty: 30, consumptionRate: 0.5, lastUpdated: "2026-08-26T08:00:00Z" },
];

export const shipmentTracks = [
  { id: "ship-001", expeditionId: "exp-001", routeLeg: "India → Cape Town", scheduledTime: "2026-08-01T06:00:00Z", status: "CONFIRMED" as const, etaHours: 0 },
  { id: "ship-002", expeditionId: "exp-001", routeLeg: "Cape Town → Maitri", scheduledTime: "2026-08-10T08:30:00Z", status: "DELAYED" as const, etaHours: 72 },
  { id: "ship-003", expeditionId: "exp-001", routeLeg: "Maitri Cargo Offload", scheduledTime: "2026-08-20T10:00:00Z", status: "CONFIRMED" as const, etaHours: 144 },
  { id: "ship-004", expeditionId: "exp-002", routeLeg: "India → Cape Town", scheduledTime: "2026-09-01T06:00:00Z", status: "CONFIRMED" as const, etaHours: 720 },
];

export const riskAlerts: RiskAlert[] = [
  { id: "risk-001", type: "SUPPLY_RISK", severity: "warn", relatedEntity: "Fuel Reserves", station: "bharati", message: "Bharati fuel at 41% — below 45% seasonal threshold. Resupply shipment delayed by 72 hours.", raisedAt: "2026-08-25T14:00:00Z", resolvedAt: null },
  { id: "risk-002", type: "PERSONNEL_RISK", severity: "critical", relatedEntity: "Dr. Sanjay Gupta", station: "maitri", message: "Medical officer Dr. Gupta showing symptoms of severe frostbite. Evacuation may be required.", raisedAt: "2026-08-26T06:30:00Z", resolvedAt: null },
  { id: "risk-003", type: "COMMS_RISK", severity: "warn", relatedEntity: "Satellite Link B", station: "bharati", message: "Ka-band satellite link experiencing intermittent 12% packet loss. Switching to backup channel.", raisedAt: "2026-08-26T02:15:00Z", resolvedAt: null },
  { id: "risk-004", type: "SUPPLY_RISK", severity: "ok", relatedEntity: "Food Stores", station: "maitri", message: "Food stores replenished. Current stock adequate for 56 days at current consumption rate.", raisedAt: "2026-08-20T10:00:00Z", resolvedAt: "2026-08-20T14:00:00Z" },
];

export const recommendations: Recommendation[] = [
  { id: "rec-001", riskAlertId: "risk-001", suggestedAction: "Prioritize Bharati resupply leg. Recommend diverting Cape Town reserve fuel bladders to next available flight window.", status: "PENDING" },
  { id: "rec-002", riskAlertId: "risk-002", suggestedAction: "Initiate telemedicine consultation. Prepare heli-evac to Maitri medical bay. Coordinate with Indian Medical Team for remote assessment.", status: "PENDING" },
  { id: "rec-003", riskAlertId: "risk-003", suggestedAction: "Maintain backup UHF channel. Schedule Ka-band antenna realignment during next clear weather window (est. 18 hours).", status: "ACCEPTED" },
  { id: "rec-004", riskAlertId: "risk-004", suggestedAction: "No action required. Monitor consumption rates. Next review scheduled in 7 days.", status: "DISMISSED" },
];

export const commsLog: CommsLogEntry[] = [
  { id: "comms-001", direction: "HQ_TO_ADMIN", message: "Station Admin Maitri, confirm receipt of Expedition Dakshin Ganga cargo manifest. Awaiting inventory reconciliation.", timestamp: "2026-08-24T08:00:00Z" },
  { id: "comms-002", direction: "ADMIN_TO_HQ", message: "HQ, Maitri confirms partial receipt. 3 of 5 pallets offloaded. Remaining held at helipad pending weather clearance.", timestamp: "2026-08-24T09:30:00Z" },
  { id: "comms-003", direction: "HQ_TO_ADMIN", message: "Copy. Weather window expected 26 Aug 14:00Z. Prioritize medical supplies if possible.", timestamp: "2026-08-24T10:15:00Z" },
  { id: "comms-004", direction: "ADMIN_TO_HQ", message: "Affirmative. Medical pallets secured and stored. Dr. Gupta reports all kits accounted for. Fuel bladders still at helipad.", timestamp: "2026-08-24T14:45:00Z" },
  { id: "comms-005", direction: "HQ_TO_ADMIN", message: "ALERT: Bharati reports fuel at 41%. We are rerouting one fuel bladder shipment from Cape Town stockpile. ETA revised.", timestamp: "2026-08-25T14:00:00Z" },
  { id: "comms-006", direction: "ADMIN_TO_HQ", message: "Received. Confirming Bharati station aware of reroute. We will coordinate cross-station resource allocation.", timestamp: "2026-08-25T15:20:00Z" },
  { id: "comms-007", direction: "ADMIN_TO_HQ", message: "URGENT: Dr. Gupta showing frostbite symptoms on left hand. Requesting telemedicine link and evacuation assessment.", timestamp: "2026-08-26T06:30:00Z" },
  { id: "comms-008", direction: "HQ_TO_ADMIN", message: "Acknowledged. Telemedicine uplink scheduled 07:00Z. Stand by for specialist consultation. Keep Dr. Gupta warm and hydrated.", timestamp: "2026-08-26T06:45:00Z" },
];

export const wasteLogs: WasteLogEntry[] = [
  { id: "waste-001", station: "maitri", category: "Packaging", quantityKg: 12.5, method: "INCINERATED", loggedAt: "2026-08-22T10:00:00Z" },
  { id: "waste-002", station: "maitri", category: "Food Waste", quantityKg: 8.2, method: "COMPACTED", loggedAt: "2026-08-23T11:30:00Z" },
  { id: "waste-003", station: "maitri", category: "Electronic Waste", quantityKg: 3.1, method: "RETURN_SHIPPED", loggedAt: "2026-08-24T09:00:00Z" },
  { id: "waste-004", station: "maitri", category: "Medical Waste", quantityKg: 1.8, method: "INCINERATED", loggedAt: "2026-08-25T14:00:00Z" },
  { id: "waste-005", station: "maitri", category: "Grey Water", quantityKg: 45.0, method: "COMPACTED", loggedAt: "2026-08-26T08:00:00Z" },
  { id: "waste-006", station: "bharati", category: "Packaging", quantityKg: 9.3, method: "INCINERATED", loggedAt: "2026-08-22T12:00:00Z" },
  { id: "waste-007", station: "bharati", category: "Food Waste", quantityKg: 6.7, method: "COMPACTED", loggedAt: "2026-08-24T10:30:00Z" },
  { id: "waste-008", station: "bharati", category: "Batteries", quantityKg: 4.5, method: "RETURN_SHIPPED", loggedAt: "2026-08-25T16:00:00Z" },
  { id: "waste-009", station: "bharati", category: "Grey Water", quantityKg: 38.0, method: "COMPACTED", loggedAt: "2026-08-26T07:00:00Z" },
];

export const syncQueue: SyncQueueItem[] = [
  { id: "sq-001", station: "maitri", action: "Cargo received: Food Stores pallet", queuedAt: "2026-08-26T05:30:00Z", status: "SYNCED" },
  { id: "sq-002", station: "maitri", action: "Fuel level logged: 68%", queuedAt: "2026-08-26T06:00:00Z", status: "SYNCED" },
  { id: "sq-003", station: "bharati", action: "Satellite link diagnostic uploaded", queuedAt: "2026-08-26T06:15:00Z", status: "PENDING" },
  { id: "sq-004", station: "bharati", action: "Personnel count verified: 19", queuedAt: "2026-08-26T07:00:00Z", status: "PENDING" },
  { id: "sq-005", station: "maitri", action: "Equipment inspection log filed", queuedAt: "2026-08-26T07:30:00Z", status: "FAILED" },
];

export const fieldUpdates: FieldUpdateEntry[] = [
  { id: "fu-001", station: "maitri", activity: "Cargo offloading from helipad", siteConditions: "Visibility 2km, wind 35kt, temp -28C", notes: "All personnel wearing full cold-weather gear. Two crates show minor damage.", loggedAt: "2026-08-26T06:00:00Z", syncStatus: "SYNCED" },
  { id: "fu-002", station: "maitri", activity: "Antenna realignment maintenance", siteConditions: "Visibility 5km, wind 20kt, temp -24C", notes: "Ka-band antenna repositioned. Signal strength improved by 8dB.", loggedAt: "2026-08-26T08:30:00Z", syncStatus: "PENDING" },
  { id: "fu-003", station: "bharati", activity: "Fuel conservation measures", siteConditions: "Visibility 3km, wind 40kt, temp -31C", notes: "Reduced heating in non-essential zones. Fuel consumption down 12%.", loggedAt: "2026-08-26T07:00:00Z", syncStatus: "SYNCED" },
  { id: "fu-004", station: "bharati", activity: "Perimeter ice wall inspection", siteConditions: "Visibility 1km, wind 45kt, temp -33C", notes: "Ice wall integrity compromised on north side. Recommending reinforcement.", loggedAt: "2026-08-26T09:00:00Z", syncStatus: "PENDING" },
];

export const locationUpdates: LocationUpdateEntry[] = [
  { id: "loc-001", station: "maitri", lat: -70.7658, lon: 11.7333, sharedAt: "2026-08-26T06:00:00Z", syncStatus: "SYNCED" },
  { id: "loc-002", station: "maitri", lat: -70.7662, lon: 11.7340, sharedAt: "2026-08-26T08:30:00Z", syncStatus: "PENDING" },
  { id: "loc-003", station: "bharati", lat: -69.4076, lon: 76.1929, sharedAt: "2026-08-26T07:00:00Z", syncStatus: "SYNCED" },
  { id: "loc-004", station: "bharati", lat: -69.4080, lon: 76.1935, sharedAt: "2026-08-26T09:00:00Z", syncStatus: "PENDING" },
];

export const sosEvents: SosEvent[] = [
  { id: "sos-001", station: "maitri", triggeredAt: "2026-08-26T06:30:00Z", syncStatus: "SYNCED", escalated: true },
];
