const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateAlert = [
  body('categoryId').optional().isInt().withMessage('Invalid category ID'),
  body('limit').isFloat({ min: 0 }).withMessage('Limit must be a positive number'),
  body('type').isIn(['category', 'general']).withMessage('Invalid alert type'),
];

// Get all alerts
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, c.name as category_name 
      FROM alerts a 
      LEFT JOIN categories c ON a.category_id = c.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create alert
router.post('/', validateAlert, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { categoryId, limit, type } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO alerts (category_id, limit_amount, type) VALUES ($1, $2, $3) RETURNING *',
      [categoryId, limit, type]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update alert
router.put('/:id', validateAlert, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { categoryId, limit, type } = req.body;
    const { rows } = await pool.query(
      'UPDATE alerts SET category_id = $1, limit_amount = $2, type = $3 WHERE id = $4 RETURNING *',
      [categoryId, limit, type, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete alert
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('DELETE FROM alerts WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json({ message: 'Alert deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check alerts
router.get('/check', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      WITH monthly_expenses AS (
        SELECT 
          category_id,
          SUM(amount) as total_amount
        FROM expenses
        WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY category_id
      )
      SELECT 
        a.*,
        c.name as category_name,
        COALESCE(me.total_amount, 0) as current_amount,
        CASE 
          WHEN COALESCE(me.total_amount, 0) >= a.limit_amount THEN 100
          WHEN COALESCE(me.total_amount, 0) >= a.limit_amount * 0.8 THEN 80
          ELSE (COALESCE(me.total_amount, 0) / a.limit_amount * 100)::integer
        END as percentage
      FROM alerts a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN monthly_expenses me ON a.category_id = me.category_id
      WHERE COALESCE(me.total_amount, 0) >= a.limit_amount * 0.8
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;