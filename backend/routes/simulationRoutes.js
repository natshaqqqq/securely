// simulationRoutes.js - Simulation API routes

const express = require('express');
const router = express.Router();
const SimulationController = require('../controllers/simulationController');

// Catalog (hub cards) — must be FIRST
router.get('/', SimulationController.getCatalog);

// By type (phish / sms / url)
router.get('/:type', SimulationController.getByType);

// Check a single answer
router.post('/check', SimulationController.check);

// Record a completed attempt
router.post('/result', SimulationController.saveResult);

module.exports = router;