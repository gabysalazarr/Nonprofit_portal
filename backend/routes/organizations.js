const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/organizations — get all orgs
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM organizations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/organizations/:role — get orgs by role
router.get('/role/:role', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM organizations WHERE role = $1 ORDER BY name ASC',
      [req.params.role]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/organizations — create org (manager only)
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  const { name, email, contact, role } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO organizations (name, email, contact, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, contact, role]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/organizations/:id/status — activate/deactivate
router.patch('/:id/status', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE organizations SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/organizations/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  try {
    await pool.query('DELETE FROM organizations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;