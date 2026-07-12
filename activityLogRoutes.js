const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('Admin'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 200');
  res.json(rows);
});

module.exports = router;
