// Reusable helper: every insert/update to a syncable table must go
// through this so the outbound_sync_events row is never forgotten.
// See build prompt section 1 — "build this first."
//
// Usage sketch:
//   await writeWithOutbox(client, {
//     table: 'cargo_items',
//     id: cargoItem.id,
//     operation: 'insert',
//     row: cargoItem,
//     priority: 'normal', // 'immediate' for SOS
//   });
module.exports = async function writeWithOutbox(_client, _opts) {
  // TODO
};
