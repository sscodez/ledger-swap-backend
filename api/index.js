const express = require('express');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Simple health check routes
app.get('/', (req, res) => {
  res.json({
    message: 'LedgerSwap API is running',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'LedgerSwap API',
    environment: 'vercel-serverless',
  });
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working', timestamp: new Date().toISOString() });
});

// Lazy load modules with error handling
let modulesLoaded = false;
let dbConnected = false;

const loadModules = async () => {
  if (modulesLoaded) return;
  
  try {
    // Load database connection
    const connectDB = require('../dist/config/db').default || require('../dist/config/db');
    if (!dbConnected) {
      await connectDB();
      dbConnected = true;
      console.log('Database connected');
    }

    // Load passport
    require('../dist/config/passport');
    const passport = require('passport');
    app.use(passport.initialize());

    // Load routes with error handling
    const routes = [
      { path: '/api/auth', module: '../dist/routes/authRoutes' },
      { path: '/api/users', module: '../dist/routes/userRoutes' },
      { path: '/api/overview', module: '../dist/routes/overviewRoutes' },
      { path: '/api/payouts', module: '../dist/routes/payoutRoutes' },
      { path: '/api/exchange-history', module: '../dist/routes/exchangeHistoryRoutes' },
      { path: '/api/exchanges', module: '../dist/routes/exchangeRoutes' },
      { path: '/api/addresses', module: '../dist/routes/addressRoutes' },
      { path: '/api/admin', module: '../dist/routes/adminRoutes' },
      { path: '/api/admin/management', module: '../dist/routes/tokenChainRoutes' },
      { path: '/api/disputes', module: '../dist/routes/disputesRoutes' },
      { path: '/api/upload', module: '../dist/routes/uploadRoutes' }
    ];

    routes.forEach(({ path, module }) => {
      try {
        const routeModule = require(module);
        const route = routeModule.default || routeModule;
        app.use(path, route);
        console.log(`Loaded route: ${path}`);
      } catch (err) {
        console.error(`Failed to load route ${path}:`, err.message);
        app.use(path, (req, res) => {
          res.status(500).json({ error: `Route ${path} unavailable`, message: err.message });
        });
      }
    });

    // Load Swagger
    try {
      const swaggerUi = require('swagger-ui-express');
      const swaggerSpec = require('../dist/config/swagger').default || require('../dist/config/swagger');
      
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'LedgerSwap API Documentation'
      }));
      
      app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
      });
      console.log('Swagger loaded successfully');
    } catch (err) {
      console.error('Failed to load Swagger:', err.message);
      app.get('/api-docs', (req, res) => {
        res.status(500).json({ error: 'API documentation unavailable' });
      });
    }

    modulesLoaded = true;
  } catch (err) {
    console.error('Failed to load modules:', err);
    throw err;
  }
};

// Middleware to initialize modules on first request
app.use(async (req, res, next) => {
  try {
    await loadModules();
    next();
  } catch (err) {
    console.error('Module loading failed:', err);
    res.status(500).json({
      error: 'Service initialization failed',
      message: err.message,
      suggestion: 'Try again in a few moments'
    });
  }
});

// Error handling
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

module.exports = app;
