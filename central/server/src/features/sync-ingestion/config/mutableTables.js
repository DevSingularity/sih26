// Mutable entities: cargo_shipments, cargo_items, inventory_stock,
// personnel. These carry real, overwritable state, so incoming writes
// are resolved with Last-Write-Wins on client_updated_at rather than
// blindly applied.
//
// `columns` is the whitelist of payload keys that may be written
// (see entityTables.js for why this must be a fixed list, never
// derived from the payload itself).
//
// The sync/audit columns — client_updated_at, server_received_at,
// sync_version, is_deleted — are NOT listed here: applyEvent.js manages
// those itself as part of the LWW algorithm, so they can never be
// silently overridden by whatever a payload happens to contain.

const MUTABLE_TABLES = {
  cargo_shipments: {
    columns: [
      'shipment_code',
      'origin',
      'destination_station_id',
      'mode',
      'status',
      'eta',
      'actual_arrival',
      'carrier_ref',
      'origin_station_id',
      'origin_device_id',
    ],
  },

  cargo_items: {
    columns: [
      'shipment_id',
      'station_id',
      'item_name',
      'category',
      'quantity',
      'unit',
      'weight_kg',
      'barcode',
      'status',
      'handled_by',
      'scanned_at',
      'verified_at',
      'confirmed_at',
      'origin_station_id',
      'origin_device_id',
    ],
  },

  inventory_stock: {
    columns: [
      'station_id',
      'item_category',
      'item_name',
      'quantity_on_hand',
      'unit',
      'reorder_threshold',
      'last_counted_at',
      'origin_device_id',
    ],
  },

  personnel: {
    columns: [
      'employee_code',
      'full_name',
      'role',
      'designation',
      'home_station_id',
      'phone',
      'email',
      'status',
      'origin_station_id',
      'origin_device_id',
    ],
  },
};

module.exports = { MUTABLE_TABLES };
