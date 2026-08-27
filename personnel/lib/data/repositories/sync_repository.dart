// The one place every feature repository should route local writes
// through: (1) write the feature's *_local row, (2) insert the matching
// outbox_queue row, both in a single Drift transaction. See build
// prompt section 1 — never let a feature repo skip step 2.
