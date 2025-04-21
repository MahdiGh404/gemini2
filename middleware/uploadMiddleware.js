// middleware/uploadMiddleware.js
const multer = require('multer');
const {ApiError} = require('../utils/errorHandler'); // Use ApiError for consistency

// Configure multer for handling file uploads
const storage = multer.memoryStorage(); // Store files in memory as Buffers

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB limit (adjust as needed for Gemini)
        files: 1 // Only allow one file per request for the 'image' field
    },
    fileFilter: (req, file, cb) => {
        // Basic MIME type validation for images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true); // Accept file
        } else {
            console.warn(`Rejected file upload: Invalid MIME type ${file.mimetype} for field ${file.fieldname}`);
            // Reject file with a specific error message
            cb(new ApiError(400, 'Invalid file type. Only image files are allowed.', {receivedType: file.mimetype}), false);
        }
    }
});

// Middleware function to handle 'image' field upload and catch Multer errors specifically
const handleImageUpload = (req, res, next) => {
    // Use multer's single method for the field named 'image'
    const processUpload = upload.single('image');

    processUpload(req, res, (err) => {
        if (err) {
            console.error('Multer error during file upload:', err);
            // Handle known Multer errors
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new ApiError(400, 'File size limit exceeded (max 10MB).'));
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return next(new ApiError(400, `Unexpected file field: '${err.field}'. Please use the 'image' field.`));
                }
                // Other Multer errors
                return next(new ApiError(400, `File upload error: ${err.message}`));
            }
            // Handle file filter errors (like wrong MIME type) which might be ApiErrors
            if (err instanceof ApiError) {
                return next(err);
            }
            // Handle other unexpected errors during upload
            return next(new ApiError(500, 'An unexpected error occurred during file upload.', {uploadError: err.message}));
        }
        // If no error, file (if provided) is available at req.file
        next();
    });
};


module.exports = handleImageUpload; // Export the middleware function directly