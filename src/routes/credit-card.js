const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid'); // Para generar ids únicos
const { createCreditSymmary, readCreditSummary, writeCreditSummary, mensualCreditCardSummary } = require('../controllers/creditCardController');

// GET: Obtener el historial completo
router.get('/', (req, res) => {
  const data = readCreditSummary();
  res.status(200).json(data);
})

router.get('/summary', mensualCreditCardSummary)

// POST: Agregar un nuevo registro
router.post('/', createCreditSymmary);

// PUT: Actualizar un registro existente
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { paymentDate, pendingAmountPesos, pendingAmountDollars, payedAmountPesos, payedAmountDollars, observations } = req.body;

  const data = readCreditSummary();
  const index = data.findIndex((entry) => entry.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'Registro no encontrado.' });
  }

  data[index] = {
    ...data[index],
    paymentDate: paymentDate || data[index].paymentDate,
    pendingAmountPesos: parseFloat(pendingAmountPesos || data[index].pendingAmountPesos),
    pendingAmountDollars: parseFloat(pendingAmountDollars || data[index].pendingAmountDollars),
    payedAmountPesos: parseFloat(payedAmountPesos || data[index].payedAmountPesos),
    payedAmountDollars: parseFloat(payedAmountDollars || data[index].payedAmountDollars),
    observations: observations || data[index].observations,
  };

  writeCreditSummary(data);
  res.json(data[index]);
});

// DELETE: Eliminar un registro
router.delete('//:id', (req, res) => {
  const { id } = req.params;

  const data = readCreditSummary();
  const filteredData = data.filter((entry) => entry.id !== id);

  if (data.length === filteredData.length) {
    return res.status(404).json({ message: 'Registro no encontrado.' });
  }

  writeCreditSummary(filteredData);
  res.status(204).send();
});

module.exports = router;