// Drift database definition. Every table below should mirror
// 03_mobile_app_schema.sql exactly (see /docs/03_personnel_app_build_prompt.md,
// section 1). Import the individual table files from ./tables/.
//
// @DriftDatabase(tables: [
//   SelfProfile, PersonnelCache, ExpeditionCache,
//   CargoItemsLocal, ResourceUsageLocal, FieldUpdatesLocal,
//   LocationPingBuffer, LocationTracksLocal, SosIncidentsLocal,
//   OutboxQueue, SyncBatchesLocal, ConnectivityLog,
// ])
// class AppDatabase extends _$AppDatabase { ... }
