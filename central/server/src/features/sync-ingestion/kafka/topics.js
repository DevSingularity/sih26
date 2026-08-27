// Don't hardcode a single-topic assumption: every station server
// produces to its own `<code>.station.events` topic (see
// schemas/README.md). Configure the full list via KAFKA_TOPICS
// (comma-separated), falling back to KAFKA_TOPIC_MAITRI for
// backwards-compat with the single-station MVP env file.
function getStationTopics(env = process.env) {
  if (env.KAFKA_TOPICS) {
    return env.KAFKA_TOPICS.split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  if (env.KAFKA_TOPIC_MAITRI) {
    return [env.KAFKA_TOPIC_MAITRI];
  }
  return ['maitri.station.events'];
}

module.exports = { getStationTopics };
