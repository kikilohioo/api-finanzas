const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getExpenses, createExpense } = require('../controllers/expenseController');

// Validation middleware
const validateExpense = [
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('store').notEmpty().trim().withMessage('Store name is required'),
  body('paymentType').isIn(['credit', 'debit', 'cash']).withMessage('Invalid payment type'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  body('categoryId').isInt().withMessage('Category ID is required'),
];

// Get expenses with filters
router.get('/', getExpenses);

// Create expense
router.post('/', validateExpense, createExpense);

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

module.exports = router;