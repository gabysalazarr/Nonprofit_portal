const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/messages — get messages for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, 
        s.name as sender_name, s.role as sender_role,
        r.name as recipient_name
      FROM messages m
      JOIN users s ON s.id = m.sender_id
      JOIN users r ON r.id = m.recipient_id
      WHERE m.recipient_id = $1 OR m.sender_id = $1
      ORDER BY m.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});



// POST /api/messages — send a message
router.post('/', authMiddleware, async (req, res) => {
  const { recipient_id, subject, body } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, subject, body)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, recipient_id, subject, body]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/messages/:id/read — mark as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE messages SET is_read = TRUE WHERE id = $1 AND recipient_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/messages/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages/users — get all users the current user can message
router.get('/contacts', authMiddleware, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'manager') {
      // Manager can see all non-manager users
      result = await pool.query(
        `SELECT u.id, u.name, u.role, o.name as org_name 
         FROM users u 
         LEFT JOIN organizations o ON o.id = u.org_id
         WHERE u.role != 'manager'
         ORDER BY u.role, o.name`
      );
    } else {
      // Orgs can only message the manager
      result = await pool.query(
        `SELECT id, name, role FROM users WHERE role = 'manager'`
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;