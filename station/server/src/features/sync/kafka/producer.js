// Polls outbound_sync_events WHERE kafka_produced_at IS NULL, produces
// to KAFKA_TOPIC, sets kafka_produced_at + kafka_offset on ack.
// 'immediate' priority (SOS) should be polled on a much shorter interval
// than normal-priority batches. See build prompt section 2.
