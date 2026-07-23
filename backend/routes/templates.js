const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/templates — all templates (manager) or assigned to org
router.get('/', authMiddleware, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'manager') {
      result = await pool.query(`
        SELECT t.*, 
          COALESCE(json_agg(ta.org_id) FILTER (WHERE ta.org_id IS NOT NULL), '[]') as assigned_org_ids
        FROM templates t
        LEFT JOIN template_assignments ta ON ta.template_id = t.id
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `);
    } else {
      result = await pool.query(`
        SELECT t.*,
          COALESCE(json_agg(ta.org_id) FILTER (WHERE ta.org_id IS NOT NULL), '[]') as assigned_org_ids
        FROM templates t
        JOIN template_assignments ta ON ta.template_id = t.id
        WHERE ta.org_id = $1
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `, [req.user.org_id]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/templates/progress — per-org assigned vs submitted counts (manager only)
router.get('/progress', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  try {
    const result = await pool.query(`
      SELECT
        o.id AS org_id,
        o.name AS org_name,
        COUNT(DISTINCT ta.template_id) AS assigned_count,
        COUNT(DISTINCT s.template_id) AS submitted_count
      FROM organizations o
      LEFT JOIN template_assignments ta ON ta.org_id = o.id
      LEFT JOIN submissions s ON s.org_id = o.id AND s.template_id = ta.template_id
      WHERE o.role = 'community-essential'
      GROUP BY o.id, o.name
      ORDER BY o.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/templates/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Template not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/templates/:id/assignments — get assigned orgs for a template
router.get('/:id/assignments', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.* FROM organizations o
      JOIN template_assignments ta ON ta.org_id = o.id
      WHERE ta.template_id = $1
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/templates — create template (manager only)
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  const { name, due_date, file_name, file_data, file_type, method, fields, assigned_org_ids } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO templates (name, due_date, file_name, file_data, file_type, method, fields)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, due_date, file_name, file_data, file_type, method || 'upload', fields ? JSON.stringify(fields) : null]
    );
    const template = result.rows[0];

    // Assign to orgs
    if (assigned_org_ids && assigned_org_ids.length > 0) {
      const assignPromises = assigned_org_ids.map(org_id =>
        pool.query(
          'INSERT INTO template_assignments (template_id, org_id) VALUES ($1, $2)',
          [template.id, org_id]
        )
      );
      await Promise.all(assignPromises);
    }

    res.json(template);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/templates/:id (manager only)
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  try {
    await pool.query('DELETE FROM templates WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});



module.exports = router;