/**
 * Hardcoded threshold config for MVP.
 * Each entry defines a metric, a warning threshold, and a critical threshold.
 * The checkThresholds function compares current values against these.
 *
 * For inventory_stock: uses the row's own reorder_threshold where available,
 * falls back to this config only for metrics not tracked per-row.
 *
 * This could move to a DB-backed config later without schema changes.
 */
module.exports = {
  fuel_level: { warning: 30, critical: 15, unit: '%' },
  power_reserve: { warning: 25, critical: 10, unit: '%' },
  water_level: { warning: 20, critical: 10, unit: '%' },
};
