// AWS Amplify server entry point
const path = require('path');

// Set NODE_ENV to production if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Set default port for Amplify
if (!process.env.PORT) {
  process.env.PORT = 3000;
}

// Load the compiled application
require('./dist/index.js');
