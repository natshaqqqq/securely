// Training routes

const express = require('express');
const router = express.Router();
const TrainingController = require('../controllers/trainingController');

// Start training session
router.post('/start', TrainingController.startTraining);

// Resume training
router.post('/resume', TrainingController.resumeTraining);

// Get progress
router.get('/progress', TrainingController.getProgress);

// Reset progress
router.post('/reset', TrainingController.resetProgress);

module.exports = router;