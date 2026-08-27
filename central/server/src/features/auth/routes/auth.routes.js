const express = require('express');
const pool = require('../../../shared/config/db');
const { authenticate } = require('../service/auth.service');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username_and_password_required' });
  }

  try {
    const result = await authenticate(pool, { username, password });
    if (!result) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    return res.json(result);
  } catch (err) {
    console.error('[auth] login failed:', err);
    return res.status(500).json({ error: 'login_failed' });
  }
});

module.exports = router;
