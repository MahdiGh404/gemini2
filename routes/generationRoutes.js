// routes/generationRoutes.js
const express = require('express');
const router = express.Router();
const GenerationController = require('../controllers/generationController');
const handleImageUpload = require('../middleware/uploadMiddleware'); // Import the configured middleware

// --- API Routes ---

// POST /api/generate
// Applies the image upload middleware first, then passes to the controller
router.post(
    '/generate',
    handleImageUpload, // Handles multipart/form-data and the 'image' file field
    GenerationController.generateContent // Controller logic
);

// GET /api/health
// Basic health check endpoint
router.get('/health', GenerationController.healthCheck);


module.exports = router;