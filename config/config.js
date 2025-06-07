// config/config.js
require('dotenv').config(); // Load environment variables from .env file

module.exports = {
    // Server port - defaults to 3010 if not set in .env
    port: process.env.PORT || 3010,

    // Google AI Studio API Key - MUST be set in .env
    googleAiApiKey1: process.env.GOOGLE_AI_API_KEY1,
    googleAiApiKey2: process.env.GOOGLE_AI_API_KEY2,

    // Gemini Model Name
    // Use a model capable of multimodal input (text/image) and potentially image generation.
    // 'gemini-1.5-flash-latest' is a good general-purpose choice.
    // You might use 'gemini-pro-vision' for image understanding or a specific image generation model
    // if available and needed. The user's second example mentioned 'gemini-2.0-flash-exp-image-generation'.
    // Using 1.5 Flash as a stable baseline. Adjust if needed.
    geminiModelName: process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash-exp-image-generation',

    // Optional: Set request timeout in milliseconds
    requestTimeout: 900000 // 60 seconds, image generation can take time
};