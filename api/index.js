const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('../dist/config/db').default;
const authRoutes = require('../dist/routes/authRoutes').default;
const userRoutes = require('../dist/routes/userRoutes').default;
const overviewRoutes = require('../dist/routes/overviewRoutes').default;
const payoutRoutes = require('../dist/routes/payoutRoutes').default;
const exchangeHistoryRoutes = require('../dist/routes/exchangeHistoryRoutes').default;
const addressRoutes = require('../dist/routes/addressRoutes').default;
const adminRoutes = require('../dist/routes/adminRoutes').default;
const disputesRoutes = require('../dist/routes/disputesRoutes').default;
const tokenChainRoutes = require('../dist/routes/tokenChainRoutes').default;
const exchangeRoutes = require('../dist/routes/exchangeRoutes').default;
const uploadRoutes = require('../dist/routes/uploadRoutes').default;
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../dist/config/swagger').default;
const cors = require('cors');
const passport = require('passport');

// Load passport configuration
require('../dist/config/passport');

dotenv.config();

const app = express();

app.use(express.json());
app.use(passport.initialize());

// CORS: allow frontend origin
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Root health/info route
app.get('/', (req, res) => {
  res.json({
    message: 'LedgerSwap API is running',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'LedgerSwap API',
    docs: '/api-docs',
    environment: 'vercel-serverless',
  });
});

// Swagger UI and JSON spec
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'LedgerSwap API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true,
  },
  customfavIcon: '/favicon.ico',
  explorer: true,
}));

app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/overview', overviewRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/exchange-history', exchangeHistoryRoutes);
app.use('/api/exchanges', exchangeRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/management', tokenChainRoutes);
app.use('/api/disputes', disputesRoutes);
app.use('/api/upload', uploadRoutes);

// Initialize database connection
let dbConnected = false;

const initializeDB = async () => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
      console.log('Database connected successfully');
    } catch (err) {
      console.error('Failed to connect to database:', err);
      throw err;
    }
  }
};

// Middleware to ensure DB is connected
app.use(async (req, res, next) => {
  try {
    await initializeDB();
    next();
  } catch (err) {
    res.status(500).json({ 
      error: 'Database connection failed',
      message: err.message 
    });
  }
});

// Handle graceful errors
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Export the Express app for Vercel
module.exports = app;
