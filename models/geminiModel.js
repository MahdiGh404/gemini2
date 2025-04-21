// models/geminiModel.js
const {GoogleGenerativeAI, HarmCategory, HarmBlockThreshold} = require('@google/generative-ai');
const config = require('../config/config');
const {ApiError} = require('../utils/errorHandler');

// Ensure API key is loaded
if (!config.googleAiApiKey) {
    throw new Error('FATAL ERROR: GOOGLE_AI_API_KEY environment variable is not set.');
}

// Initialize the Google AI Client
const genAI = new GoogleGenerativeAI(config.googleAiApiKey);

// Configure safety settings (adjust as needed)
// Blocking NONE allows more content but increases risk. Be cautious.
const safetySettings = [
    {category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
    {category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
    {category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
    {category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
    // Consider BLOCK_NONE for specific use cases carefully
    // { category: HarmCategory.HARM_CATEGORY_HARASSMENT,       threshold: HarmBlockThreshold.BLOCK_NONE },
    // { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,      threshold: HarmBlockThreshold.BLOCK_NONE },
    // { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    // { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

class GeminiModel {
    /**
     * Sends a request to the Gemini API using the @google/genai SDK.
     * @param {string} prompt - The user's text prompt.
     * @param {Buffer | null} imageBuffer - Optional image buffer.
     * @param {string | null} imageMimeType - Optional image mime type (e.g., 'image/png').
     * @returns {Promise<object>} - The processed response containing either text or image data.
     * @throws {ApiError} - Throws custom API errors for upstream issues.
     */
    static async generateContent(prompt, imageBuffer = null, imageMimeType = null) {
        try {
            console.log(`Using Gemini Model: ${config.geminiModelName}`);
            const model = genAI.getGenerativeModel({
                model: config.geminiModelName,
                safetySettings: safetySettings,
                // Generation Config (Optional): Control output parameters
                // generationConfig: {
                //     temperature: 0.9,
                //     topK: 1,
                //     topP: 1,
                //     maxOutputTokens: 2048,
                // }
            });

            const requestParts = [{text: prompt}];

            if (imageBuffer && imageMimeType) {
                console.log(`Adding image to request (${imageMimeType})`);
                // Validate MIME type slightly
                if (!imageMimeType.startsWith('image/')) {
                    throw new ApiError(400, 'Invalid image MIME type provided.');
                }
                requestParts.push({
                    inlineData: {
                        data: imageBuffer.toString('base64'),
                        mimeType: imageMimeType,
                    },
                });
            } else {
                console.log('No image provided, sending text-only request.');
            }

            console.log('Sending request to Gemini API...');
            // The SDK handles constructing the full request object
            const result = await model.generateContent(requestParts);

            console.log('Received response from Gemini API.');
            const response = result.response; // Access the response object directly

            // Process the response
            return GeminiModel.processResponse(response);

        } catch (error) {
            console.error('Error calling Gemini API:', error);

            // Check for specific SDK error types or properties if available
            // Example: Check if it's a safety-related block
            if (error.message && error.message.includes('response was blocked')) {
                // Often, details are in response.promptFeedback
                const blockReason = error.response?.promptFeedback?.blockReason || 'Safety settings';
                const safetyRatings = error.response?.candidates?.[0]?.safetyRatings || 'N/A';
                throw new ApiError(400, `Request blocked due to safety settings: ${blockReason}`, {safetyRatings});
            }
            // Check for permission denied (likely API key issue)
            if (error.message && (error.message.includes('API key not valid') || error.status === 'PERMISSION_DENIED')) {
                throw new ApiError(401, 'Authentication failed. Check your GOOGLE_AI_API_KEY.', {sdkError: error.message});
            }

            // Check for quota exceeded
            if (error.message && error.message.includes('Quota exceeded')) {
                throw new ApiError(429, 'API quota exceeded. Please check your usage limits.', {sdkError: error.message});
            }

            // Generic upstream error
            throw new ApiError(
                502, // Bad Gateway suggests an issue upstream
                'Error communicating with the Google AI service.',
                {sdkError: error.message} // Include SDK's error message for details
            );
        }
    }

    /**
     * Processes the response from the Gemini API SDK.
     * Extracts text or image data.
     * @param {object} apiResponse - The `response` object from the SDK's result.
     * @returns {{ type: 'text' | 'image' | 'empty' | 'error', data: object }} - Structured response.
     */
    static processResponse(apiResponse) {
        try {
            console.log('Processing API response...');

            if (!apiResponse) {
                console.warn('API response object is missing.');
                return {type: 'error', data: {error: 'Received no response object from API.'}};
            }

            // Check for prompt feedback, especially blocks
            if (apiResponse.promptFeedback?.blockReason) {
                console.warn(`Response blocked: ${apiResponse.promptFeedback.blockReason}`);
                return {
                    type: 'error',
                    data: {
                        error: `Content generation blocked due to: ${apiResponse.promptFeedback.blockReason}`,
                        details: {safetyRatings: apiResponse.candidates?.[0]?.safetyRatings}
                    }
                };
            }

            if (!apiResponse.candidates || apiResponse.candidates.length === 0) {
                console.warn('No candidates found in the response.');
                // Check finish reason if available
                const finishReason = apiResponse.candidates?.[0]?.finishReason;
                if (finishReason && finishReason !== 'STOP') {
                    return {
                        type: 'text',
                        data: {text: `Generation stopped due to: ${finishReason}. No content available.`}
                    };
                }
                return {type: 'empty', data: {text: 'The model did not return any content.'}};
            }

            const candidate = apiResponse.candidates[0];

            // Check finish reason for the candidate
            if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                console.warn(`Candidate finish reason: ${candidate.finishReason}`);
                // Handle specific reasons like SAFETY or RECITATION
                if (candidate.finishReason === 'SAFETY') {
                    return {
                        type: 'error',
                        data: {
                            error: 'Content generation stopped due to safety concerns.',
                            details: {safetyRatings: candidate.safetyRatings}
                        }
                    };
                }
                if (candidate.finishReason === 'RECITATION') {
                    return {type: 'error', data: {error: 'Content generation stopped due to potential recitation.'}};
                }
                // Other reasons like MAX_TOKENS or unspecified
                return {
                    type: 'text',
                    data: {text: `Generation stopped unexpectedly (${candidate.finishReason}). Partial content might be missing.`}
                };
            }


            if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                console.warn('No content parts found in the candidate.');
                return {type: 'empty', data: {text: 'The model returned a candidate but no content parts.'}};
            }

            const parts = candidate.content.parts;

            // --- Prioritize Image Data ---
            // The SDK typically puts generated images in 'inlineData'
            const imagePart = parts.find(part => part.inlineData && part.inlineData.mimeType.startsWith('image/'));
            if (imagePart) {
                console.log(`Image found in response (mimeType: ${imagePart.inlineData.mimeType})`);
                return {
                    type: 'image',
                    data: {
                        imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
                    }
                };
            }

            // --- Fallback to Text Data ---
            // Combine text from all parts that contain text
            const textContent = parts
                .filter(part => typeof part.text === 'string')
                .map(part => part.text)
                .join('\n'); // Join multiple text parts with newline

            if (textContent) {
                console.log('Text content found in response.');
                return {
                    type: 'text',
                    data: {
                        text: textContent
                    }
                };
            }

            // --- Handle Unexpected/Empty Parts ---
            console.warn('Response received, but no recognizable text or image data found in parts.');
            return {
                type: 'empty',
                data: {text: 'Model response did not contain usable text or image data.', rawParts: parts}
            };

        } catch (error) {
            console.error('Error processing API response:', error);
            return {
                type: 'error',
                data: {
                    error: `Failed to process the API response: ${error.message}`,
                    // Avoid sending the raw response back to the client in production
                    rawResponse: process.env.NODE_ENV === 'development' ? apiResponse : undefined
                }
            };
        }
    }
}

module.exports = GeminiModel;