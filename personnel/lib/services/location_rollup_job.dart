// Background job: every ~2-5 min OR ~50 points (whichever first), rolls
// up location_ping_buffer into one location_tracks_local row
// (points_json array), clears the buffer. See build prompt section 4 —
// never enqueue individual GPS pings to the outbox.
