const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const filePath = path.join(__dirname, '../db/alerts.json');

// Validation middleware
const validateAlert = [
  body('category').isString().withMessage('Invalid category'),
  body('limit').isFloat({ min: 0 }).withMessage('Limit must be a positive number'),
];

// Helper function to read alerts from JSON
const readAlerts = () => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

// Helper function to write alerts to JSON
const writeAlerts = (alerts) => {
  fs.writeFileSync(filePath, JSON.stringify(alerts, null, 2));
};

// Get all alerts
router.get('/', (req, res) => {
  const alerts = readAlerts();
  res.json(alerts);
});

// Create alert
router.post('/', validateAlert, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const newAlert = { id: Date.now(), ...req.body };
  const alerts = readAlerts();
  alerts.push(newAlert);
  writeAlerts(alerts);

  res.status(201).json(newAlert);
});

// Update alert
router.put('/:id', validateAlert, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const alerts = readAlerts();
  const alertIndex = alerts.findIndex(alert => alert.id === id);

  if (alertIndex === -1) {
    return res.status(404).json({ message: 'Alert not found' });
  }

  alerts[alertIndex] = { ...alerts[alertIndex], ...req.body };
  writeAlerts(alerts);

  res.json(alerts[alertIndex]);
});

// Delete alert
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const alerts = readAlerts();
  const newAlerts = alerts.filter(alert => alert.id !== parseInt(id));

  if (newAlerts.length === alerts.length) {
    return res.status(404).json({ message: 'Alert not found' });
  }

  writeAlerts(newAlerts);
  res.json({ message: 'Alert deleted successfully' });
});

module.exports = router;