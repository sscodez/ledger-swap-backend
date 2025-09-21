// Entry point for deployment platforms (Elastic Beanstalk, Railway, etc.)
// This file ensures the platform can find a recognized entry point

// Set NODE_ENV to production if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Set default port
const PORT = process.env.PORT || 8080;
process.env.PORT = PORT;

console.log(`Starting LedgerSwap API on port ${PORT}...`);

// Load the compiled application
require('./dist/index.js');
