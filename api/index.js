const express = require('express');
const dotenv = require('dotenv');

// Load environment variables first
dotenv.config();

const app = express();

// Basic middleware setup
app.use(express.json());

// CORS setup
const cors = require('cors');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Database connection handling
let dbConnected = false;
let connectDB;

const initializeDB = async () => {
  if (!dbConnected && connectDB) {
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

// Middleware to ensure DB is connected (placed before routes)
app.use(async (req, res, next) => {
  try {
    if (!connectDB) {
      // Lazy load database connection
      try {
        const dbModule = require('../dist/config/db');
        connectDB = dbModule.default || dbModule;
      } catch (err) {
        console.error('Failed to load database module:', err);
        return res.status(500).json({ 
          error: 'Database module not found',
          message: 'Make sure to run npm run build first' 
        });
      }
    }
    await initializeDB();
    next();
  } catch (err) {
    res.status(500).json({ 
      error: 'Database connection failed',
      message: err.message 
    });
  }
});

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

// Lazy load and setup routes
const setupRoutes = () => {
  try {
    // Load passport configuration
    require('../dist/config/passport');
    const passport = require('passport');
    app.use(passport.initialize());

    // Load routes with error handling
    const loadRoute = (path, routePath) => {
      try {
        const routeModule = require(path);
        const route = routeModule.default || routeModule;
        app.use(routePath, route);
      } catch (err) {
        console.error(`Failed to load route ${path}:`, err);
        // Create a fallback route that returns an error
        app.use(routePath, (req, res) => {
          res.status(500).json({ 
            error: `Route ${routePath} not available`,
            message: 'Build files may be missing' 
          });
        });
      }
    };

    // Load all routes
    loadRoute('../dist/routes/authRoutes', '/api/auth');
    loadRoute('../dist/routes/userRoutes', '/api/users');
    loadRoute('../dist/routes/overviewRoutes', '/api/overview');
    loadRoute('../dist/routes/payoutRoutes', '/api/payouts');
    loadRoute('../dist/routes/exchangeHistoryRoutes', '/api/exchange-history');
    loadRoute('../dist/routes/exchangeRoutes', '/api/exchanges');
    loadRoute('../dist/routes/addressRoutes', '/api/addresses');
    loadRoute('../dist/routes/adminRoutes', '/api/admin');
    loadRoute('../dist/routes/tokenChainRoutes', '/api/admin/management');
    loadRoute('../dist/routes/disputesRoutes', '/api/disputes');
    loadRoute('../dist/routes/uploadRoutes', '/api/upload');

    // Setup Swagger documentation
    try {
      const swaggerUi = require('swagger-ui-express');
      const swaggerModule = require('../dist/config/swagger');
      const swaggerSpec = swaggerModule.default || swaggerModule;

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
    } catch (err) {
      console.error('Failed to setup Swagger:', err);
      app.get('/api-docs', (req, res) => {
        res.status(500).json({ error: 'API documentation not available' });
      });
    }

  } catch (err) {
    console.error('Failed to setup routes:', err);
  }
};

// Setup routes
setupRoutes();

// Handle graceful errors
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Export the Express app for Vercel
module.exports = app;
