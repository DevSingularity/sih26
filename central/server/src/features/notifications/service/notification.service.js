const pool = require('../../../shared/config/db');

// In-app notification: insert alert_notifications row for each open alert
async function dispatchNotifications(alert) {
  try {
    // In-app: always create a notification record
    await pool.query(
      `INSERT INTO alert_notifications (alert_id, channel, delivery_status)
       VALUES ($1, 'in_app', 'delivered')`,
      [alert.id]
    );

    const provider = process.env.NOTIFICATIONS_SMS_PROVIDER;

    if (provider === 'twilio' || provider === 'msg91') {
      // Stub: real SMS integration goes here
      console.log(`[notifications] SMS stub: would send "${alert.title}" via ${provider}`);
    }

    // Email stub
    console.log(`[notifications] email stub: would send "${alert.title}"`);
  } catch (err) {
    console.error('[notifications] dispatch failed:', err);
  }
}

module.exports = { dispatchNotifications };
