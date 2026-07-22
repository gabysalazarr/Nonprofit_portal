const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
require('dotenv').config();

// POST /api/auth/login checks emial/password, returns JWT token signed with JWT_SECRET
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, org_id: user.org_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Get org name
    const orgResult = user.org_id
      ? await pool.query('SELECT name FROM organizations WHERE id = $1', [user.org_id])
      : { rows: [] };

    res.json({
      token,
      user: {
        id:       user.id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        org_id:   user.org_id,
        org_name: orgResult.rows[0]?.name || null,
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.org_id, o.name as org_name
      FROM users u
      LEFT JOIN organizations o ON o.id = u.org_id
      WHERE u.id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/auth/register (manager only in production) hashes password with bcrpyts, insearts user into users tables
router.post('/register', async (req, res) => {
  const { name, email, password, role, org_id } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, org_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, hash, role, org_id || null]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;