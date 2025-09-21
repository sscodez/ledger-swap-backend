const express = require('express');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'LedgerSwap API is running',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'LedgerSwap API',
    environment: 'vercel-serverless'
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Basic API is working', 
    timestamp: new Date().toISOString() 
  });
});

module.exports = app;
