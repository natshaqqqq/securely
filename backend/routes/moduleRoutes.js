// Module routes
const express = require('express');
const router = express.Router();
const ModuleController = require('../controllers/moduleController');

// List all modules
router.get('/', ModuleController.getAllModules);

// Complete a module directly
router.post('/complete', ModuleController.completeModule);

// Quiz routes — these MUST come before /:id
router.get('/:id/quiz', ModuleController.getModuleQuiz);
router.post('/:id/quiz/answer', ModuleController.answerQuestion);
router.post('/:id/quiz/finish', ModuleController.finishQuiz);
router.delete('/:id/progress', ModuleController.resetModuleProgress);

// Get one module
router.get('/:id', ModuleController.getModuleById);

module.exports = router;