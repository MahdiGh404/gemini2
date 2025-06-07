// app.js - Main Express Application Setup
const express = require('express');
const config = require('./config/config'); // Load configuration first
const generationRoutes = require('./routes/generationRoutes');
const { errorMiddleware } = require('./utils/errorHandler');
const path = require('path'); // Needed for serving static HTML

// --- Critical Check: API Key ---
// Exit immediately if the essential API key is missing.
if (!config.googleAiApiKey1) {
    console.error('*****************************************************');
    console.error('FATAL ERROR: GOOGLE_AI_API_KEY is not set.');
    console.error('Please create a .env file with your API key.');
    console.error('*****************************************************');
    process.exit(1); // Exit the application
}

// --- Create Express App ---
const app = express();

// --- Core Middleware ---
// Parse JSON request bodies
app.use(express.json({ limit: '10mb' })); // Increase limit if needed for potential large base64 inputs? (Usually handled by multer)
// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// --- Request Logging Middleware (Simple) ---
// Logs basic information about each incoming request
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} from ${req.ip}`);
    next(); // Pass control to the next middleware
});

// --- API Routes ---
// Mount the generation API routes under the /api prefix
app.use('/api', generationRoutes);

// --- Root Route & Info ---
// Simple informational endpoint for the API root
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the Gemini Flash Image Generation API',
        documentation: '/test-form', // Point users to the test form
        endpoints: {
            generate: {
                method: 'POST',
                path: '/api/generate',
                description: 'Generate content (text or image) based on prompt and optional image input.',
                body: 'multipart/form-data',
                fields: {
                    prompt: 'string (required) - The text prompt for the model.',
                    image: 'file (optional) - An image file to include in the request.'
                }
            },
            health: {
                method: 'GET',
                path: '/api/health',
                description: 'Check the health status of the API.'
            }
        }
    });
});


// --- HTML Test Form Route ---
// Serves a simple HTML form for testing the API directly from a browser.
// This uses the same HTML structure provided in the user's original code.
app.get('/test-form', (req, res) => {
    // Note: Embedding large HTML directly in JS isn't always ideal.
    // For more complex UIs, consider using a template engine (EJS, Handlebars)
    // or serving static HTML files.
    res.send(`
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
      <title>تست API</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; background-color: #f8f9fa; color: #333; direction: rtl; }
        h1, h2 { color: #0056b3; border-bottom: 1px solid #dee2e6; padding-bottom: 10px; }
        .container { background-color: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: bold; color: #555; }
        textarea, input[type="file"] { width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 4px; box-sizing: border-box; font-size: 1rem; }
        textarea { min-height: 80px; resize: vertical; }
        button { padding: 12px 25px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; transition: background-color 0.2s ease; }
        button:hover { background: #0056b3; }
        button:disabled { background: #6c757d; cursor: not-allowed; }
        .loading { display: inline-block; width: 18px; height: 18px; border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 1s ease-in-out infinite; margin-right: 8px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
        #result { margin-top: 25px; padding: 20px; border: 1px solid #e9ecef; border-radius: 4px; min-height: 100px; background-color: #f8f9fa; white-space: pre-wrap; font-family: monospace; font-size: 0.9rem; overflow-x: auto; }
        #result.hidden { display: none; }
        #result-content img { max-width: 100%; height: auto; display: block; margin: 15px 0; border-radius: 4px; border: 1px solid #dee2e6; }
        .error { color: #dc3545; font-weight: bold; }
        .error-details { color: #6c757d; font-size: 0.85rem; margin-top: 5px; }
        .tabs { display: flex; margin-bottom: -1px; /* Overlap border */ }
        .tab { padding: 10px 18px; cursor: pointer; border: 1px solid #dee2e6; border-bottom: none; border-radius: 4px 4px 0 0; margin-left: 5px; background-color: #e9ecef; }
        .tab.active { background-color: #fff; border-bottom: 1px solid #fff; position: relative; top: 1px; font-weight: bold; }
        .tab-content { display: none; border: 1px solid #dee2e6; border-top: none; padding: 20px; border-radius: 0 0 4px 4px; background-color: #fff; }
        .tab-content.active { display: block; }
        .examples { margin-top: 15px; }
        .example { margin-bottom: 10px; padding: 10px; background: #e9ecef; border-radius: 4px; cursor: pointer; transition: background-color 0.2s ease; }
        .example:hover { background: #ced4da; }
        pre { background-color: #e9ecef; padding: 15px; border-radius: 4px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>تست API</h1>

        <div class="tabs main-tabs">
          <div class="tab active" data-tab="form">فرم تست</div>
        </div>

        <div class="tab-content active" id="form-tab">
          <form id="testForm" enctype="multipart/form-data">
            <div class="form-group">
              <label for="prompt">کلید</label>
              <textarea id="prompt" name="prompt" rows="4" required placeholder="کلید را وارد کنید."></textarea>
            </div>
            <div class="form-group">
              <label for="image">تصویر ورودی:</label>
              <input type="file" id="image" name="image" accept="image/*">
            </div>
            <button type="submit" id="submitBtn">
              <span id="loading" class="loading" style="display:none;"></span>
              ارسال درخواست
            </button>
          </form>

          <div id="result" class="hidden">
             <h2>نتیجه:</h2>
             <div id="result-content"></div>
             <h3>اطلاعات خام پاسخ (JSON):</h3>
             <pre id="raw-result">...</pre>
          </div>
        </div>


      </div>

      <script>


        // --- Form Submission ---
        const form = document.getElementById('testForm');
        const submitBtn = document.getElementById('submitBtn');
        const loadingSpinner = document.getElementById('loading');
        const resultDiv = document.getElementById('result');
        const resultContentDiv = document.getElementById('result-content');
        const rawResultPre = document.getElementById('raw-result');

        form.addEventListener('submit', async (e) => {
          e.preventDefault(); // Prevent default HTML form submission

          // Disable button and show spinner
          submitBtn.disabled = true;
          loadingSpinner.style.display = 'inline-block';
          resultDiv.classList.add('hidden'); // Hide previous result
          resultContentDiv.innerHTML = ''; // Clear previous content
          rawResultPre.textContent = 'در حال ارسال درخواست...';

          const formData = new FormData(form);

          try {
            const response = await fetch('/api/generate', { // Target the API endpoint
              method: 'POST',
              body: formData // FormData handles multipart encoding automatically
              // No 'Content-Type' header needed when using FormData with fetch
            });

            const data = await response.json(); // Parse the JSON response from the server

            // Display raw JSON response first
             rawResultPre.textContent = JSON.stringify(data, null, 2); // Pretty print JSON

            resultDiv.classList.remove('hidden'); // Show result area

            if (!response.ok) {
               // Handle HTTP errors (e.g., 400, 500) returned by our API
               console.error('API Error Response:', data);
              
            } else {
               // Handle successful responses (200 OK)
               if (data.imageUrl) {
                 resultContentDiv.innerHTML = '<p><strong>تصویر تولید شده:</strong></p><img src="' + data.imageUrl + '" alt="Generated Image">';
               } else if (data.text) {
                 resultContentDiv.innerHTML = '<p><strong>پاسخ متنی:</strong></p><div>' + escapeHtml(data.text) + '</div>'; // Escape HTML in text response
               } else if (data.message) { // Handle cases like 'empty' response
                  resultContentDiv.innerHTML = '<p>' + escapeHtml(data.message) + '</p>';
               }
               else {
                 resultContentDiv.innerHTML = '<p>پاسخ دریافت شد، اما فرمت نامشخص بود. لطفاً JSON خام را بررسی کنید.</p>';
                 console.warn("Received successful response but couldn't find imageUrl or text:", data);
               }
            }

          } catch (error) {
            // Handle network errors or issues connecting to the server
            console.error('Fetch Error:', error);
            resultContentDiv.innerHTML = '<p class="error">خطا در ارسال درخواست: ' + escapeHtml(error.message) + '</p>';
          } finally {
            // Re-enable button and hide spinner regardless of success or failure
            submitBtn.disabled = false;
            loadingSpinner.style.display = 'none';
          }
        });

        // Simple HTML escaping function
        function escapeHtml(unsafe) {
            if (!unsafe) return '';
            return unsafe
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
         }

      </script>
    </body>
    </html>
  `);
});


// --- 404 Not Found Handler ---
// This should be placed after all other routes
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Not Found',
        message: `The requested path '${req.path}' does not exist on this server.`
    });
});

// --- Global Error Handler ---
// This must be the LAST middleware added
app.use(errorMiddleware);

module.exports = app; // Export the configured Express app