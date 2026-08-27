// Reads connectivity_log, batches pending outbox_queue rows (priority
// DESC, created_at ASC), POSTs to {station_base_url}/api/sync/push,
// marks accepted rows synced, retries with backoff on failure.
// 'immediate' (SOS) rows trigger an out-of-cycle flush attempt.
// See /docs/03_personnel_app_build_prompt.md, section 5.
