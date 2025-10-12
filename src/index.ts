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
import blogRoutes from './routes/blogRoutes';
import kucoinRoutes from './routes/kucoinRoutes';
import cryptoFeeRoutes from './routes/cryptoFeeRoutes';
import contactRoutes from './routes/contactRoutes';
import kucoinMonitoringService from './services/kucoinMonitoringService';

dotenv.config();
const app = express();

app.use(express.json());
app.use(passport.initialize());

// CORS: allow frontend origins
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = [
  FRONTEND_URL,
  'https://ledgerswap.io',
  'https://www.ledgerswap.io',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
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
app.use('/api/blogs', blogRoutes);
app.use('/api/kucoin', kucoinRoutes);
app.use('/api/crypto-fees', cryptoFeeRoutes);
app.use('/api/contacts', contactRoutes);



async function start() {
  try {
    await connectDB();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // Start KuCoin monitoring service after server is running
      setTimeout(async () => {
        try {
          console.log('🚀 Starting KuCoin monitoring service...');
          await kucoinMonitoringService.start();
        } catch (error: any) {
          console.error('❌ Failed to start KuCoin monitoring service:', error.message);
        }
      }, 5000); // Wait 5 seconds for server to fully initialize
    });
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

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  kucoinMonitoringService.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  kucoinMonitoringService.stop();
  process.exit(0);
});

start();
