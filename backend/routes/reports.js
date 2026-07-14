const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/reports — manager gets all, orgs get visible ones
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reports ORDER BY uploaded_at DESC');
    if (req.user.role === 'manager') {
      return res.json(result.rows);
    }
    // Filter by visibility
    const visible = result.rows.filter(r => {
      const visibleTo = r.visible_to;
      return visibleTo.includes('all') || visibleTo.includes(String(req.user.org_id));
    });
    res.json(visible);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reports — manager only
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  const { name, file_name, file_data, file_type, visible_to } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO reports (name, file_name, file_data, file_type, visible_to)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, file_name, file_data, file_type, JSON.stringify(visible_to || ['all'])]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/reports/:id — manager only
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  try {
    await pool.query('DELETE FROM reports WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;