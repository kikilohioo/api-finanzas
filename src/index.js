const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const morgan = require('morgan');
const incomesRouter = require('./routes/incomes');
const expensesRouter = require('./routes/expenses');
const alertsRouter = require('./routes/alerts');

const app = express();
const PORT = process.env.PORT || 3000;

const tagsPaymentTypes = {
  cash: 'Efectivo',
  debit: 'Debito',
  credit: 'Credito'
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/incomes', incomesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/alerts', alertsRouter);

// Summary route
app.get('/api/summary', async (req, res) => {
  const { startDate, endDate } = req.query;
  const expensesFilePath = path.join(__dirname, './db/expenses.json');
  const incomesFilePath = path.join(__dirname, './db/incomes.json');

  try {
    const expensesData = JSON.parse(fs.readFileSync(expensesFilePath, 'utf8') || '[]');
    const incomesData = JSON.parse(fs.readFileSync(incomesFilePath, 'utf8') || '[]');

    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    const filteredExpenses = expensesData.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= start && itemDate <= end;
    });

    const filteredIncomes = incomesData.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= start && itemDate <= end;
    });

    const totalExpenses = filteredExpenses.reduce((acc, item) => acc + parseFloat(item.amount), 0);
    const totalIncomes = filteredIncomes.reduce((acc, item) => acc + parseFloat(item.amount), 0);

    const expensesByCategory = filteredExpenses.reduce((acc, item) => {
      const category = item.category || 'Unknown';
      acc[category] = (acc[category] || 0) + parseFloat(item.amount);
      return acc;
    }, {});

    const incomesBySource = filteredIncomes.reduce((acc, item) => {
      const source = item.source || 'Unknown';
      acc[source] = (acc[source] || 0) + parseFloat(item.amount);
      return acc;
    }, {});

    const expensesByPaymentType = filteredExpenses.reduce((acc, item) => {
      const paymentType = item.paymentType || 'Other';
      const translatedType = tagsPaymentTypes[paymentType] || 'Otro'; // Traducción o valor por defecto
      acc[translatedType] = (acc[translatedType] || 0) + parseFloat(item.amount);
      return acc;
    }, {});

    res.json({
      totalExpenses,
      totalIncomes,
      expensesByCategory: Object.keys(expensesByCategory).map((name) => ({ name, value: expensesByCategory[name] })),
      expensesByPaymentType: Object.keys(expensesByPaymentType).map((name) => ({ name, value: expensesByPaymentType[name] })),
      incomesBySource: Object.keys(incomesBySource).map((name) => ({ name, value: incomesBySource[name] })),
    });
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ message: 'Error fetching summary data.' });
  }
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});