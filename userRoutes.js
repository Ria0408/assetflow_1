const express = require('express');
const router = express.Router();
const generic = require('../controllers/genericController')('users', ['name', 'role', 'department_id']);
const { authenticate, authorize } = require('../middleware/auth');
const pool = require('../config/db');

router.get('/', authenticate, async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, email, role, department_id, created_at FROM users');
  res.json(rows);
});
router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, email, role, department_id, created_at FROM users WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: 'User not found.' });
  res.json(rows[0]);
});
router.put('/:id/role', authenticate, authorize('Admin'), async (req, res) => {
  const { role } = req.body;
  await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
  res.json({ message: 'Role updated.' });
});
router.put('/:id', authenticate, generic.update);
router.delete('/:id', authenticate, authorize('Admin'), generic.remove);

module.exports = router;
