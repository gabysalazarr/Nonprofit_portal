const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/submissions — all (manager) or by org
router.get('/', authMiddleware, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'manager') {
      result = await pool.query(`
        SELECT s.*, o.name as org_name FROM submissions s
        JOIN organizations o ON o.id = s.org_id
        ORDER BY s.submitted_at DESC
      `);
    } else {
      result = await pool.query(`
        SELECT s.*, o.name as org_name FROM submissions s
        JOIN organizations o ON o.id = s.org_id
        WHERE s.org_id = $1
        ORDER BY s.submitted_at DESC
      `, [req.user.org_id]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/submissions/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM submissions WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/submissions — create submission
router.post('/', authMiddleware, async (req, res) => {
  const { template_id, role, file_name, file_data, file_type, report_name, answers } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO submissions (template_id, org_id, role, file_name, file_data, file_type, report_name, answers)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [template_id, req.user.org_id, role, file_name, file_data, file_type, report_name, answers ? JSON.stringify(answers) : null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/submissions/:id/status — update status (manager only)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  const { status, rejection_comment } = req.body;
  try {
    const result = await pool.query(
      `UPDATE submissions SET status = $1, rejection_comment = $2 WHERE id = $3 RETURNING *`,
      [status, rejection_comment || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;