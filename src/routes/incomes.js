const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid'); // Para generar ids únicos

// Validation middleware para ingreso (income)
const validateIncome = [
	body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
	body('source').isIn(['Sueldo', 'Otros']).withMessage('Source must be either "Sueldo" or "Otros"'),
	body('date').optional().isISO8601().withMessage('Invalid date format'),
	body('description').notEmpty().withMessage('Description is required'),
];

// Obtener ingresos con filtros
router.get('/', async (req, res) => {
	const filePath = path.join(__dirname, '../db/incomes.json');
	const { startDate, endDate } = req.query;

	fs.readFile(filePath, 'utf8', (err, data) => {
		if (err) {
			console.error('Error reading incomes.json:', err);
			res.status(500).json({ message: 'Error reading incomes.' });
			return;
		}

		let incomes = JSON.parse(data || '[]');

		// Filtrar los ingresos si se han proporcionado fechas de inicio y fin
		if (startDate && endDate) {
			const start = new Date(startDate);
			const end = new Date(endDate);

			incomes = incomes.filter((income) => {
				const incomeDate = new Date(income.date);
				return incomeDate >= start && incomeDate <= end;
			});
		}

		res.status(200).json(incomes);
	});
});

// Crear ingreso
router.post('/', validateIncome, async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	const income = { id: uuidv4(), ...req.body }; // Generar un id único para cada ingreso
	const filePath = path.join(__dirname, '../db/incomes.json');

	// Leer archivo si existe o iniciar un array vacío
	fs.readFile(filePath, 'utf8', (err, data) => {
		let incomes = [];
		if (!err && data) {
			incomes = JSON.parse(data);
		}

		// Agregar el nuevo ingreso al array
		incomes.push(income);

		// Guardar el array actualizado en el archivo
		fs.writeFile(filePath, JSON.stringify(incomes, null, 2), (writeErr) => {
			if (writeErr) {
				console.error('Error writing to incomes.json:', writeErr);
				res.status(500).json({ message: 'Error saving income.' });
			} else {
				res.status(201).json({ message: 'Income successfully recorded.' });
			}
		});
	});
});

// Actualizar ingreso
router.put('/:id', validateIncome, (req, res) => {
	const { id } = req.params;
	const updatedIncome = req.body;
	const filePath = path.join(__dirname, '../db/incomes.json');

	fs.readFile(filePath, 'utf8', (err, data) => {
		if (err) {
			console.error('Error reading incomes.json:', err);
			res.status(500).json({ message: 'Error reading incomes.' });
			return;
		}

		let incomes = JSON.parse(data || '[]');
		const incomeIndex = incomes.findIndex((income) => income.id === id);

		if (incomeIndex !== -1) {
			incomes[incomeIndex] = { ...incomes[incomeIndex], ...updatedIncome };

			fs.writeFile(filePath, JSON.stringify(incomes, null, 2), (writeErr) => {
				if (writeErr) {
					console.error('Error updating income:', writeErr);
					res.status(500).json({ message: 'Error updating income.' });
				} else {
					res.status(200).json({ message: 'Income successfully updated.' });
				}
			});
		} else {
			res.status(404).json({ message: 'Income not found.' });
		}
	});
});

// Eliminar ingreso por id
router.delete('/:id', (req, res) => {
	const { id } = req.params;
	const filePath = path.join(__dirname, '../db/incomes.json');

	fs.readFile(filePath, 'utf8', (err, data) => {
		if (err) {
			console.error('Error reading incomes.json:', err);
			res.status(500).json({ message: 'Error reading incomes.' });
			return;
		}

		let incomes = JSON.parse(data || '[]');
		const filteredIncomes = incomes.filter((income) => income.id !== id);

		if (filteredIncomes.length === incomes.length) {
			res.status(404).json({ message: 'Income not found.' });
		} else {
			fs.writeFile(filePath, JSON.stringify(filteredIncomes, null, 2), (writeErr) => {
				if (writeErr) {
					console.error('Error deleting income:', writeErr);
					res.status(500).json({ message: 'Error deleting income.' });
				} else {
					res.status(200).json({ message: 'Income successfully deleted.' });
				}
			});
		}
	});
});

module.exports = router;
