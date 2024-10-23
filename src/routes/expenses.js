const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateExpense = [
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('store').notEmpty().trim().withMessage('Store name is required'),
  body('paymentType').isIn(['credit', 'debit', 'cash']).withMessage('Invalid payment type'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  body('categoryId').isInt().withMessage('Category ID is required'),
];

// Get expenses with filters
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, categoryId } = req.query;
    let query = `
      SELECT e.*, c.name as category_name 
      FROM expenses e 
      JOIN categories c ON e.category_id = c.id 
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += ` AND e.date BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(startDate, endDate);
    }

    if (categoryId) {
      query += ` AND e.category_id = $${params.length + 1}`;
      params.push(categoryId);
    }

    query += ' ORDER BY e.date DESC';
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create expense
router.post('/', validateExpense, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { amount, store, paymentType, date, categoryId } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO expenses (amount, store, payment_type, date, category_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [amount, store, paymentType, date || new Date(), categoryId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update expense
router.put('/:id', validateExpense, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { amount, store, paymentType, date, categoryId } = req.body;
    const { rows } = await pool.query(
      'UPDATE expenses SET amount = $1, store = $2, payment_type = $3, date = $4, category_id = $5 WHERE id = $6 RETURNING *',
      [amount, store, paymentType, date, categoryId, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get expense summary
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { rows } = await pool.query(`
      SELECT 
        c.name as category,
        e.payment_type,
        SUM(e.amount) as total,
        COUNT(*) as count
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.date BETWEEN $1 AND $2
      GROUP BY c.name, e.payment_type
      ORDER BY total DESC
    `, [startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1), endDate || new Date()]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;