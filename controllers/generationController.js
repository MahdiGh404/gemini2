// controllers/generationController.js
const GeminiModel = require('../models/geminiModel');
const {ApiError} = require('../utils/errorHandler');

/**
 * Controller for handling content generation requests.
 */
class GenerationController {
    /**
     * Handles the POST /generate request.
     * Validates input, calls the Gemini Model, processes the result, and sends the JSON response.
     */
    static async generateContent(req, res, next) {
        try {
            const {prompt} = req.body;
            const imageFile = req.file; // Provided by multer middleware

            // --- Input Validation ---
            if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
                // Use ApiError for structured error handling
                throw new ApiError(400, 'Text prompt (prompt) is required and cannot be empty.');
            }

            // Log request details (avoid logging file buffer in production for large files)
            console.log('--- New Generation Request ---');
            console.log(`Prompt: "${prompt}"`);
            if (imageFile) {
                console.log(`Image received: ${imageFile.originalname} (${imageFile.mimetype}, ${imageFile.size} bytes)`);
            } else {
                console.log("No image file provided.");
            }

            // --- Call Model Layer ---
            const modelResponse = await GeminiModel.generateContent(
                prompt.trim(), // Send trimmed prompt
                imageFile ? imageFile.buffer : null,
                imageFile ? imageFile.mimetype : null
            );

            // --- Process and Send Response ---
            console.log(`Model response type: ${modelResponse.type}`);

            // Add raw response for debugging if not in production
            if (process.env.NODE_ENV !== 'production') {
                modelResponse.data._raw_model_response_type = modelResponse.type; // Keep track of original type
            }

            // Handle different response types from the model
            switch (modelResponse.type) {
                case 'image':
                case 'text':
                    res.status(200).json(modelResponse.data);
                    break;
                case 'empty':
                    // Return a 200 OK but indicate no content was generated
                    res.status(200).json({message: modelResponse.data.text || 'No content generated.'});
                    break;
                case 'error':
                    // If the model layer processed an error (like safety block), return 400 or appropriate status
                    // Use 400 for client-side issues (like safety blocks), 500 for internal processing errors
                    const statusCode = modelResponse.data.error?.toLowerCase().includes('blocked') ? 400 : 500;
                    res.status(statusCode).json({
                        error: modelResponse.data.error || 'An error occurred while processing the model response.',
                        details: modelResponse.data.details
                    });
                    break;
                default:
                    // Should not happen if model layer is correct, but handle defensively
                    console.error(`Unexpected response type from model: ${modelResponse.type}`);
                    throw new ApiError(500, 'Received an unexpected response format from the AI model.');
            }

        } catch (error) {
            // Log the full error for server-side debugging
            console.error('Error in GenerationController:', error);

            // Pass the error to the centralized error handling middleware
            // If it's not already an ApiError, the middleware will handle it as a 500
            next(error);
        }
    }

    /**
     * Basic health check endpoint.
     */
    static healthCheck(req, res) {
        res.status(200).json({status: 'ok', timestamp: new Date().toISOString()});
    }
}

module.exports = GenerationController;