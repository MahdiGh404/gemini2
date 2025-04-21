// server.js - Entry point for the Node.js application
const app = require('./app');       // Import the configured Express app
const config = require('./config/config'); // Import configuration (port, etc.)

const PORT = config.port;

// --- Start the Server ---
const server = app.listen(PORT, () => {
    console.log(`-------------------------------------------------------`);
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`🔑 Google AI API Key Loaded: ${config.googleAiApiKey ? 'Yes' : 'NO (Critical Error!)'}`);
    console.log(`🧠 Using Gemini Model: ${config.geminiModelName}`);
    console.log(`-------------------------------------------------------`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`📝 Test Form URL: http://localhost:${PORT}/test-form`);
    console.log(`-------------------------------------------------------`);
    console.log('Press Ctrl+C to stop the server.');
});

// --- Graceful Shutdown Handling ---
// Handle common signals for termination
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log('✅ Server closed. Exiting process.');
        process.exit(0); // Exit successfully
    });

    // Force shutdown if server hasn't closed after a timeout
    setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcing shutdown.');
        process.exit(1); // Exit with error code
    }, 10000); // 10 seconds timeout
};

process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // kill command

// --- Global Error Handling (Process Level) ---
// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 UNHANDLED REJECTION! 💥');
    console.error('Reason:', reason);
    // In a real app, you might log this to an error tracking service
    // Consider shutting down gracefully as the application might be in an unstable state
    // gracefulShutdown('Unhandled Rejection'); // Uncomment to shutdown on unhandled rejections
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 UNCAUGHT EXCEPTION! 💥');
    console.error('Error:', error);
    // It's generally recommended to exit the process after an uncaught exception
    // as the application state might be corrupted.
    console.error('Application will exit due to uncaught exception.');
    process.exit(1); // Exit with error code immediately
});