const serverless = require('serverless-http');
const app = require('../../index');

// Load payload content from build-generated module
// The build command converts payload.js into a requireable module
try {
    const payloadContent = require('./payload-content');
    app.set('payloadContent', payloadContent);
} catch (e) {
    console.error('Warning: payload-content.js not found. Build may have failed.');
}

module.exports.handler = serverless(app);
