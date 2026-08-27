// This file is documentation, not executable logic — a JSDoc-style
// contract for the "store" object applyEvent.js and processBatch.js
// depend on. Depending on this narrow interface (instead of a raw `pg`
// client) is what lets the LWW/idempotency logic in applyEvent.js be
// unit-tested with a plain in-memory object, no database required.
//
// Two implementations exist:
//   - store/pgStore.js        real Postgres-backed implementation, used
//                              by kafka/consumer.js in production.
//   - tests/fakes/inMemoryStore.js   in-memory fake used by tests.
//
// interface SyncStore {
//   // Run `fn(scopedStore)` inside a DB transaction. Must resolve/reject
//   // together with `fn`; on rejection, everything `fn` did must be
//   // rolled back. `scopedStore` implements this same interface, bound
//   // to the transaction's connection.
//   withTransaction(fn: (scopedStore: SyncStore) => Promise<T>): Promise<T>
//
//   // Row-lock (`SELECT ... FOR UPDATE`) and return the current stored
//   // row for a mutable entity, or null if it doesn't exist yet.
//   // Must be called inside withTransaction to make the lock meaningful.
//   getMutableRow(table: string, id: string): Promise<Row|null>
//
//   // Insert a brand-new mutable-entity row (no existing row was found).
//   insertMutableRow(table: string, row: Row): Promise<void>
//
//   // Update an existing mutable-entity row in place.
//   updateMutableRow(table: string, id: string, patch: Row): Promise<void>
//
//   // Insert an append-only event row. Must be a no-op (not an error)
//   // if a row with this `id` already exists. Returns whether a new
//   // row was actually inserted.
//   insertEventRow(table: string, row: Row): Promise<{ inserted: boolean }>
//
//   // Record a discarded/losing write for audit.
//   recordConflict(conflict: {
//     entity_table: string,
//     entity_id: string,
//     incoming_value: object,
//     existing_value: object,
//     resolution: 'incoming_wins' | 'existing_wins',
//   }): Promise<void>
//
//   // Record one consumed Kafka batch.
//   recordBatch(batch: {
//     source_station_id: string,
//     kafka_topic: string,
//     kafka_offset_start: number|null,
//     kafka_offset_end: number|null,
//     record_count: number,
//     status: 'processed' | 'partial' | 'failed',
//   }): Promise<{ id: string }>
// }

module.exports = {};
