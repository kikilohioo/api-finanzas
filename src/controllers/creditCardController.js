const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid'); // Para generar ids únicos
const { createExpenseAux } = require('./expenseController');

// Función para leer el archivo de datos
exports.readCreditSummary = () => {
  const creditSummaryFilePath = path.join(__dirname, '../db/credit-card.json');
  try {
    return JSON.parse(fs.readFileSync(creditSummaryFilePath, 'utf8') || '[]');
  } catch (err) {
    console.error('Error leyendo el archivo:', err);
    return [];
  }
};

// Función para escribir en el archivo de datos
exports.writeCreditSummary = (data) => {
  const creditSummaryFilePath = path.join(__dirname, '../db/credit-card.json');
  try {
    fs.writeFileSync(creditSummaryFilePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error escribiendo en el archivo:', err);
  }
};

// POST: Agregar un nuevo registro
exports.createCreditSymmary = async (req, res) => {
  const { paymentDate, pendingAmountPesos, pendingAmountDollars, payedAmountPesos, payedAmountDollars, observations } = req.body;

  if (!paymentDate || pendingAmountPesos == null || pendingAmountDollars == null) {
    return res.status(400).json({ message: 'Faltan campos obligatorios.' });
  }

  const newEntry = {
    id: uuidv4(),
    paymentDate,
    pendingAmountPesos: parseFloat(pendingAmountPesos),
    pendingAmountDollars: parseFloat(pendingAmountDollars),
    payedAmountPesos: parseFloat(payedAmountPesos || 0),
    payedAmountDollars: parseFloat(payedAmountDollars || 0),
    observations: observations || '',
  };

  const data = this.readCreditSummary();
  data.push(newEntry);
  this.writeCreditSummary(data);

  const expenseBody = {
    id: uuidv4(),
    amount: parseFloat(payedAmountPesos + (payedAmountDollars*40) || 0), // Monto total pagado
    store: 'pago tarjeta de credito', // Puedes ajustar el valor de "store" según lo que necesites
    paymentType: 'debit', // Determinar el tipo de pago
    date: paymentDate,
    category: "Otros", // ID de categoría predeterminado, ajusta según tu lógica
  };

  req.body = expenseBody;

  // Llamar al controlador de gastos
  await createExpenseAux(req); // Llama al controlador de gastos

  res.status(201).json(newEntry);
};

exports.mensualCreditCardSummary = async (req, res) => {
    const { fromDate, toDate } = req.query;
  
    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'fromDate y toDate son requeridos.' });
    }
  
    const data = this.readCreditSummary();

    // Filtrar los datos por fecha
    const filteredPayments = data.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      return paymentDate >= new Date(fromDate) && paymentDate <= new Date(toDate);
    });
  
    // Calcular los totales
    const summary = filteredPayments.reduce(
      (acc, payment, index) => {
        if (index === 0) {
          acc.totalPendingPesos = payment.pendingAmountPesos;
          acc.totalPendingDollars = payment.pendingAmountDollars;
        }
        acc.totalPayedPesos += payment.payedAmountPesos;
        acc.totalPayedDollars += payment.payedAmountDollars;
        return acc;
      },
      {
        totalPendingPesos: 0,
        totalPendingDollars: 0,
        totalPayedPesos: 0,
        totalPayedDollars: 0
      }
    );
  
    res.json({
      filteredPayments,
      summary
    });
};