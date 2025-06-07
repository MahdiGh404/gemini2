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
            let final_prompt;
            let {prompt} = req.body;
            const imageFile = req.file; // Provided by multer middleware


            // --- Input Validation ---
            if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
                // Use ApiError for structured error handling
                throw new ApiError(400, 'Text prompt (prompt) is required and cannot be empty.');
            }


            switch (prompt) {
                case "1":
                    // Add Sunglasses
                    final_prompt = "Add photorealistic, high-quality sunglasses to the person's face. The sunglasses should look natural and fit perfectly on their face structure. CRITICAL: Maintain 100% of the subject's original facial identity, features, skin texture, and distinctive characteristics. The sunglasses should complement their appearance without altering any underlying facial structure or details.";
                    break;
                case "20":
                    // Prescription Glasses
                    final_prompt = "Add elegant, photorealistic prescription glasses that perfectly match the person's face shape and style. The glasses should have clear lenses allowing full visibility of the eyes. CRITICAL: Preserve 100% of the subject's original facial identity, features, skin texture, and distinctive characteristics. Maintain all facial details visible through and around the glasses with perfect clarity.";
                    break;
                case "30":
                    // Add Hat
                    final_prompt = "Add a stylish, realistic beanie hat to the person's head that fits naturally on their hair and head shape. CRITICAL: Ensure the original facial identity, expression, skin texture, and all facial features remain 100% unchanged and highly detailed. The hat should complement their appearance without altering any aspect of their face or identity.";
                    break;
                case "40":
                    // Change Expression to Angry Frown
                    final_prompt = "Modify ONLY the person's expression to show an angry frown, with furrowed brows and slightly downturned mouth. CRITICAL: Preserve with absolute precision their complete facial identity, structure, unique features, skin texture, eye color, and all other distinctive characteristics. Change nothing but the minimal features needed for the expression change.";
                    break;
                case "2":
                    //Left Three-Quarter View
                    final_prompt = "Generate a photorealistic image reorienting the person's face to a perfect left three-quarter view (approximately 45 degrees toward their left shoulder). The head rotation must be distinctive and unmistakable. CRITICAL REQUIREMENT: Maintain 100% accuracy in reconstructing their original facial identity, unique proportions, features, skin texture, and all defining characteristics from this new angle. Create a natural perspective shift that appears as if the original photograph was actually captured from this angle, with all facial features coherently repositioned while preserving their exact appearance.";
                    break;
                case "3":
                    //Right Three-Quarter View
                    final_prompt = "Generate a photorealistic image reorienting the person's face to a perfect right three-quarter view (approximately 45 degrees toward their right shoulder). The head rotation must be distinctive and unmistakable. CRITICAL REQUIREMENT: Maintain 100% accuracy in reconstructing their original facial identity, unique proportions, features, skin texture, and all defining characteristics from this new angle. Create a natural perspective shift that appears as if the original photograph was actually captured from this angle, with all facial features coherently repositioned while preserving their exact appearance.";
                    break;
                case "4":
                    //Left Profile View
                    final_prompt = "Generate a photorealistic image reorienting the person to a complete left profile view (90 degrees, with their left side facing the camera). The profile must be precise and definitive. CRITICAL REQUIREMENT: Maintain 100% accuracy in reconstructing their original facial identity, unique proportions, and all defining characteristics from this side perspective. Ensure realistic rendering of typically profile-visible features like the nose bridge, jawline, and ear, while preserving their exact facial structure. The result must appear as if the photograph was actually taken directly from their left side, with perfect lighting consistency and detail preservation.";
                    break;
                case "5":
                    //Right Profile View
                    final_prompt = "Generate a photorealistic image reorienting the person to a complete right profile view (90 degrees, with their right side facing the camera). The profile must be precise and definitive. CRITICAL REQUIREMENT: Maintain 100% accuracy in reconstructing their original facial identity, unique proportions, and all defining characteristics from this side perspective. Ensure realistic rendering of typically profile-visible features like the nose bridge, jawline, and ear, while preserving their exact facial structure. The result must appear as if the photograph was actually taken directly from their right side, with perfect lighting consistency and detail preservation.";
                    break;
            }


            // Log request details (avoid logging file buffer in production for large files)
            console.log('--- New Generation Request ---');
            console.log(`Prompt: "${prompt} Final Prompt: "${final_prompt}"`);
            if (imageFile) {
                console.log(`Image received: ${imageFile.originalname} (${imageFile.mimetype}, ${imageFile.size} bytes)`);
            } else {
                console.log("No image file provided.");
            }


            // --- Call Model Layer ---
            const modelResponse = await GeminiModel.generateContent(
                final_prompt.trim(), // Send trimmed prompt
                imageFile ? imageFile.buffer : null,
                imageFile ? imageFile.mimetype : null);

            // --- Process and Send Response ---
            console.log(`Model response type: ${modelResponse.type}`);

            // Add raw response for debugging if not in production
            if (process.env.NODE_ENV !== 'production') {
                modelResponse.data._raw_model_response_type = modelResponse.type; // Keep track of original type
            }

            // Handle different response types from the model
            switch (modelResponse.type) {
                case 'image':
                    res.status(200).json({
                        imageUrl: modelResponse.data.imageUrl,
                        text: modelResponse.data.text || null // Include text if available
                    });
                    break;
                case 'text':
                    res.status(200).json({
                        text: modelResponse.data.text
                    });
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


}

module.exports = GenerationController;