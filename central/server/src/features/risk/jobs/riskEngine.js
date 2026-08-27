const cron = require('node-cron');
const pool = require('../../../shared/config/db');

// Evaluate current resource/inventory levels against risk_thresholds.
// Runs every 5 minutes. In production, also triggered post-sync-batch.
async function evaluateRisks() {
  try {
    const { rows: thresholds } = await pool.query(
      'SELECT * FROM risk_thresholds'
    );

    for (const t of thresholds) {
      let currentValue = null;
      let metricLabel = t.metric;

      if (t.metric === 'fuel_level' || t.metric === 'power_reserve') {
        const { rows } = await pool.query(
          `SELECT SUM(quantity_on_hand) as total
           FROM inventory_stock
           WHERE station_id = $1 AND item_category = $2 AND is_deleted = false`,
          [t.station_id, t.metric === 'fuel_level' ? 'fuel' : 'power']
        );
        currentValue = parseFloat(rows[0]?.total || 0);
      } else if (t.metric.startsWith('inventory:')) {
        const itemName = t.metric.replace('inventory:', '');
        const { rows } = await pool.query(
          `SELECT quantity_on_hand FROM inventory_stock
           WHERE station_id = $1 AND item_name = $2 AND is_deleted = false`,
          [t.station_id, itemName]
        );
        currentValue = parseFloat(rows[0]?.quantity_on_hand || 0);
      } else if (t.metric.startsWith('resource:')) {
        const resourceType = t.metric.replace('resource:', '');
        const { rows } = await pool.query(
          `SELECT status, COUNT(*) as count FROM resources
           WHERE station_id = $1 AND resource_type = $2 GROUP BY status`,
          [t.station_id, resourceType]
        );
        const offline = rows.find(r => r.status === 'offline');
        currentValue = offline ? parseInt(offline.count) : 0;
      }

      if (currentValue === null) continue;

      let severity = null;
      let title = null;

      if (t.critical_value !== null && currentValue <= t.critical_value) {
        severity = 'critical';
        title = `CRITICAL: ${metricLabel} at ${currentValue} (threshold: ${t.critical_value})`;
      } else if (t.warning_value !== null && currentValue <= t.warning_value) {
        severity = 'warning';
        title = `WARNING: ${metricLabel} at ${currentValue} (threshold: ${t.warning_value})`;
      }

      if (severity) {
        const existing = await pool.query(
          `SELECT id FROM alerts
           WHERE station_id = $1 AND source_type = 'threshold'
           AND title = $2 AND status = 'open'`,
          [t.station_id, title]
        );

        if (existing.rows.length === 0) {
          await pool.query(
            `INSERT INTO alerts (station_id, source_type, severity, title, message)
             VALUES ($1, 'threshold', $2, $3, $4)`,
            [t.station_id, severity, title, `Metric ${metricLabel} breached threshold. Current: ${currentValue}, Warning: ${t.warning_value}, Critical: ${t.critical_value}`]
          );
          console.log(`[risk-engine] alert raised: ${title}`);
        }
      }
    }
  } catch (err) {
    console.error('[risk-engine] evaluation failed:', err);
  }
}

// Generate a basic flight readiness assessment for each station
async function generateFlightReadiness() {
  try {
    const { rows: stations } = await pool.query(
      `SELECT id FROM stations WHERE status = 'active'`
    );

    for (const station of stations) {
      const [resources, weather, alerts] = await Promise.all([
        pool.query(
          `SELECT resource_type, status, COUNT(*) as count
           FROM resources WHERE station_id = $1 GROUP BY resource_type, status`,
          [station.id]
        ),
        pool.query(
          `SELECT risk_score FROM risk_predictions
           WHERE station_id = $1 AND risk_type = 'weather'
           ORDER BY predicted_at DESC LIMIT 1`,
          [station.id]
        ),
        pool.query(
          `SELECT COUNT(*) as count FROM alerts
           WHERE station_id = $1 AND status = 'open' AND severity = 'critical'`,
          [station.id]
        ),
      ]);

      const totalResources = resources.rows.reduce((s, r) => s + parseInt(r.count), 0);
      const offlineResources = resources.rows
        .filter(r => r.status === 'offline')
        .reduce((s, r) => s + parseInt(r.count), 0);
      const resourceScore = totalResources > 0 ? (totalResources - offlineResources) / totalResources : 1;
      const weatherScore = weather.rows[0] ? 1 - parseFloat(weather.rows[0].risk_score) : 0.5;
      const criticalAlerts = parseInt(alerts.rows[0].count);
      const alertScore = criticalAlerts === 0 ? 1 : Math.max(0, 1 - criticalAlerts * 0.2);

      const readinessScore = (resourceScore * 0.4 + weatherScore * 0.3 + alertScore * 0.3);
      const status = readinessScore >= 0.7 ? 'go' : readinessScore >= 0.4 ? 'caution' : 'no_go';

      await pool.query(
        `INSERT INTO flight_readiness_assessments
         (station_id, readiness_score, weather_snapshot, resource_snapshot, recommendation, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          station.id,
          readinessScore.toFixed(2),
          JSON.stringify({ weather_score: weatherScore }),
          JSON.stringify({ resource_score: resourceScore, offline_count: offlineResources }),
          status === 'go'
            ? 'Flight operations may proceed.'
            : status === 'caution'
            ? 'Flight operations require caution. Review resource availability.'
            : 'Flight operations suspended. Critical issues detected.',
          status,
        ]
      );
    }
  } catch (err) {
    console.error('[risk-engine] flight readiness generation failed:', err);
  }
}

// Generate AI recommendations for open SOS incidents
async function generateRecommendations() {
  try {
    const { rows: incidents } = await pool.query(
      `SELECT si.*, s.name as station_name
       FROM sos_incidents si
       LEFT JOIN stations s ON si.station_id = s.id
       WHERE si.status IN ('reported', 'acknowledged')
       AND NOT EXISTS (
         SELECT 1 FROM ai_recommendations ar
         WHERE ar.context_table = 'sos_incidents' AND ar.context_id = si.id
       )`
    );

    for (const incident of incidents) {
      let recommendation = '';
      switch (incident.severity) {
        case 'critical':
          recommendation = `URGENT: ${incident.incident_type} incident at ${incident.station_name}. Deploy medical/response team immediately. Evacuate if necessary.`;
          break;
        case 'high':
          recommendation = `High-priority ${incident.incident_type} incident. Coordinate with station team. Prepare backup resources.`;
          break;
        case 'medium':
          recommendation = `Monitor ${incident.incident_type} incident. Gather additional information before escalation.`;
          break;
        default:
          recommendation = `Log and monitor ${incident.incident_type} incident. Schedule follow-up review.`;
      }

      await pool.query(
        `INSERT INTO ai_recommendations
         (station_id, context_table, context_id, recommendation_text, confidence_score, model_version)
         VALUES ($1, 'sos_incidents', $2, $3, $4, 'rule-engine-v1')`,
        [incident.station_id, incident.id, recommendation, 0.8]
      );
    }
  } catch (err) {
    console.error('[risk-engine] recommendation generation failed:', err);
  }
}

function startRiskEngine() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('[risk-engine] running scheduled evaluation...');
    await evaluateRisks();
    await generateFlightReadiness();
    await generateRecommendations();
  });
  console.log('[risk-engine] scheduled (every 5 min)');
}

module.exports = { startRiskEngine, evaluateRisks, generateFlightReadiness, generateRecommendations };
