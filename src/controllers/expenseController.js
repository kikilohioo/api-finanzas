const fs = require('fs');
const path = require('path');

// Get expenses with filters
exports.getExpenses = async (req, res) => {
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
};

exports.createExpenseAux = async (req) => {
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
    return fs.writeFile(filePath, JSON.stringify(expenses, null, 2), (writeErr) => {
      return writeErr
    });
  });
};

exports.createExpense = async (req, res) => {
  let writeErr = await this.createExpenseAux(req)
  if (writeErr) {
    console.error('Error al escribir en expenses.json:', writeErr);
    res.status(500).json({ message: 'Error al guardar el gasto.' });
  } else {
    res.status(201).json({ message: 'Gasto registrado con éxito.' });
  }
};