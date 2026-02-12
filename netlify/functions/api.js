const serverless = require('serverless-http');
const path = require('path');
const fs = require('fs');
const app = require('../../index');

// Pre-load payload.js content so it's available at runtime
// The build command copies payload.js into this directory
const payloadPath = path.join(__dirname, 'payload.js');
let payloadContent = '// payload not found';
try {
    payloadContent = fs.readFileSync(payloadPath, 'utf8');
} catch (e) {
    console.error('Warning: payload.js not found at', payloadPath);
}

// Make payload content available to the app
app.set('payloadContent', payloadContent);

module.exports.handler = serverless(app);
