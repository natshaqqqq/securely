// resourceRoutes.js - Resource API routes

const express = require('express');
const router = express.Router();
const ResourceController = require('../controllers/resourceController');

router.get('/', ResourceController.getAll);

module.exports = router;