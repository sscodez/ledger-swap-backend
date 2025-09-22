import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import overviewRoutes from './routes/overviewRoutes';
import payoutRoutes from './routes/payoutRoutes';
import exchangeHistoryRoutes from './routes/exchangeHistoryRoutes';
import addressRoutes from './routes/addressRoutes';
import passport from 'passport';
import './config/passport';
import adminRoutes from './routes/adminRoutes';
import disputesRoutes from './routes/disputesRoutes';
import tokenChainRoutes from './routes/tokenChainRoutes';
import exchangeRoutes from './routes/exchangeRoutes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import cors from 'cors';
import uploadRoutes from './routes/uploadRoutes';
import cryptoRoutes from './routes/cryptoRoutes';

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

const PORT = process.env.PORT || 8080;

// Root health/info route
app.get('/', (req, res) => {
  res.json({
    message: 'LedgerSwap API is running',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health check endpoint for EB
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'LedgerSwap API',
    docs: '/api-docs',
    baseUrl: `http://localhost:${PORT}`,
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
  customJs: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
  ],
  explorer: true,
  customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css'
}));

app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

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
app.use('/api/crypto', cryptoRoutes);



async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown and unhandled errors
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

start();
