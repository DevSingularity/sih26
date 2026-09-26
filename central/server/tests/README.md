Put the LWW-conflict integration test described in the build prompt
(section 1) here first — it's the highest-value test in this service.

## Status

Done. Run with:

```
npm test
# or directly:
node --test tests/*.test.js
```

No install step needed for these tests — they use Node's built-in
`node:test` runner and `node:assert/strict` (both ship with Node 22),
against an in-memory fake of the `SyncStore` interface
(`tests/fakes/inMemoryStore.js`), so they don't need Postgres, Kafka,
or any npm dependency running. `jest` is still listed as a
devDependency in case the team wants to migrate later, but nothing
here depends on it.

- `applyEvent.test.js` — the required LWW-conflict test (an older
  update arriving after a newer one is discarded and logged to
  `sync_conflicts`, never applied to the live row), plus:
  chronological-order sanity, tie-breaking on `client_updated_at`,
  `sync_version` incrementing, event-table idempotency
  (`ON CONFLICT (id) DO NOTHING`), unsupported deletes on append-only
  tables, soft-delete tombstoning on mutable entities, unknown-table
  rejection, malformed-event rejection, and the column whitelist (no
  unexpected/injected payload keys ever reach a row).
- `processBatch.test.js` — `sync_batches` recording, partial-failure
  tolerance (one bad event doesn't sink the whole batch), and the
  immediate/SOS single-event batch path.

`kafka/consumer.js` and `store/pgStore.js` depend on `kafkajs`/`pg`
and a real broker/database, so they're intentionally *not* covered by
these tests — instead, all the actual ingestion logic they call
(`applyEvent`, `processBatch`) is decoupled behind the `SyncStore`
interface (`src/features/sync-ingestion/store/syncStore.interface.js`)
specifically so it's testable without either.
