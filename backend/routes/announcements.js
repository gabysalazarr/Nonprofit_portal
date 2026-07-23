const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/announcements
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM announcements ORDER BY posted_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { message, audience, video_name, attachment_name } = req.body;
  try {
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const authorName = userResult.rows[0]?.name || 'Unknown';

    const result = await pool.query(
      `INSERT INTO announcements (author_id, author_name, author_role, message, audience, video_name, attachment_name, posted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [req.user.id, authorName, req.user.role, message, JSON.stringify(audience), video_name || null, attachment_name || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;