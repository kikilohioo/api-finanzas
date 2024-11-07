const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
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
  const filePath = path.join(__dirname, '../db/expenses.json');
  const { startDate, endDate } = req.query;

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error al leer expenses.json:', err);
      res.status(500).json({ message: 'Error al leer los gastos.' });
      return;
    }

    let expenses = JSON.parse(data || '[]');

    // Filtrar los gastos si se han proporcionado fechas de inicio y fin
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      expenses = expenses.filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= start && expenseDate <= end;
      });
    }

    res.status(200).json(expenses);
  });
});

// Create expense
router.post('/', validateExpense, async (req, res) => {
  const expense = req.body;
  const filePath = path.join(__dirname, '../db/expenses.json');

  // Leer archivo si existe o iniciar un array vacío
  fs.readFile(filePath, 'utf8', (err, data) => {
    let expenses = [];
    if (!err && data) {
      expenses = JSON.parse(data);
    }

    // Agregar el nuevo gasto al array
    expenses.push(expense);

    // Guardar el array actualizado en el archivo
    fs.writeFile(filePath, JSON.stringify(expenses, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('Error al escribir en expenses.json:', writeErr);
        res.status(500).json({ message: 'Error al guardar el gasto.' });
      } else {
        res.status(201).json({ message: 'Gasto registrado con éxito.' });
      }
    });
  });
});

// Update expense
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updatedExpense = req.body;
  const filePath = path.join(__dirname, '../db/expenses.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error al leer expenses.json:', err);
      res.status(500).json({ message: 'Error al leer los gastos.' });
      return;
    }

    let expenses = JSON.parse(data || '[]');
    const expenseIndex = expenses.findIndex((expense) => expense.id === id);

    if (expenseIndex !== -1) {
      expenses[expenseIndex] = { ...expenses[expenseIndex], ...updatedExpense };

      fs.writeFile(filePath, JSON.stringify(expenses, null, 2), (writeErr) => {
        if (writeErr) {
          console.error('Error al actualizar el gasto:', writeErr);
          res.status(500).json({ message: 'Error al actualizar el gasto.' });
        } else {
          res.status(200).json({ message: 'Gasto actualizado con éxito.' });
        }
      });
    } else {
      res.status(404).json({ message: 'Gasto no encontrado.' });
    }
  });
});

// Ruta para eliminar un gasto por id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(__dirname, '../db/expenses.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error al leer expenses.json:', err);
      res.status(500).json({ message: 'Error al leer los gastos.' });
      return;
    }

    let expenses = JSON.parse(data || '[]');
    const filteredExpenses = expenses.filter((expense) => expense.id !== id);

    if (filteredExpenses.length === expenses.length) {
      res.status(404).json({ message: 'Gasto no encontrado.' });
    } else {
      fs.writeFile(filePath, JSON.stringify(filteredExpenses, null, 2), (writeErr) => {
        if (writeErr) {
          console.error('Error al eliminar el gasto:', writeErr);
          res.status(500).json({ message: 'Error al eliminar el gasto.' });
        } else {
          res.status(200).json({ message: 'Gasto eliminado con éxito.' });
        }
      });
    }
  });
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