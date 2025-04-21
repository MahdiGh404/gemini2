// utils/errorHandler.js

/**
 * Custom error class for API-specific errors.
 * Allows setting a status code and optional details.
 */
class ApiError extends Error {
    constructor(statusCode, message, details = null) {
        super(message); // Pass message to the base Error class
        this.statusCode = statusCode; // HTTP status code (e.g., 400, 404, 500)
        this.details = details;       // Optional structured details about the error
        this.name = this.constructor.name; // Set error name to 'ApiError'
        Error.captureStackTrace(this, this.constructor); // Capture stack trace
    }
}

/**
 * Express error handling middleware.
 * Catches errors passed via next(error) and sends a standardized JSON response.
 */
const errorMiddleware = (err, req, res, next) => {
    // Log the error internally (consider using a more robust logger like Winston in production)
    console.error('--- Error Handler ---');
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error(`Path: ${req.path}`);
    console.error(`Status Code: ${err.statusCode || 500}`);
    console.error(`Message: ${err.message}`);
    if (err.details) {
        console.error(`Details: ${JSON.stringify(err.details)}`);
    }
    // Log stack trace only in development for clarity, avoid in production logs unless necessary
    if (process.env.NODE_ENV !== 'production') {
        console.error(`Stack: ${err.stack}`);
    }
    console.error('---------------------');


    // Default error details
    let statusCode = 500;
    let responseBody = {
        error: 'Internal Server Error',
        // Avoid leaking stack traces or sensitive details in production
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
    };

    // If it's a known ApiError, use its properties
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        responseBody.error = err.message; // Use ApiError message as the main error description
        responseBody.message = err.details || (process.env.NODE_ENV === 'production' ? 'See error field for details.' : err.message); // Put details in message or keep original msg
        // Only include details if they exist
        if (err.details) {
            responseBody.details = err.details;
            // Remove the generic 'message' field if we have details to avoid redundancy
            delete responseBody.message;
        }
    } else if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
        // Handle malformed JSON request bodies specifically
        statusCode = 400;
        responseBody.error = 'Bad Request: Malformed JSON';
        responseBody.message = 'The request body could not be parsed as valid JSON.';
    }
    // Add handling for other specific error types if needed (e.g., database errors)

    // Send the JSON response
    res.status(statusCode).json(responseBody);

    // Note: We don't call next(err) again here, as this is the final error handler.
};

module.exports = {
    ApiError,
    errorMiddleware
};