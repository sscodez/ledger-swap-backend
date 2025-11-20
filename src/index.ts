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
import cryptoFeeRoutes from './routes/cryptoFeeRoutes';
import contactRoutes from './routes/contactRoutes';
import flaggedCheckRoutes from './routes/flaggedCheckRoutes';
import chainRoutes from './routes/chainRoutes';
import tokenRoutes from './routes/tokenRoutes';

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

// Email Service Status Route
app.get('/api/email-status', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    
    const smtpHost = process.env.SMTP_HOST || 'mail.name.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER || "admin@ledgerswap.io";
    const smtpPass = process.env.SMTP_PASS || "Matrix$345";
    
    const isConfigured = !!(smtpHost && smtpUser && smtpPass);
    
    let connectionStatus = 'unknown';
    let connectionError = null;

    if (isConfigured) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.verify();
        connectionStatus = 'connected';
      } catch (error) {
        connectionStatus = 'failed';
        connectionError = error instanceof Error ? error.message : 'Unknown connection error';
      }
    } else {
      connectionStatus = 'not_configured';
    }

    res.json({
      success: true,
      status: 'healthy',
      configuration: {
        host: smtpHost || 'not_set',
        port: smtpPort || 'not_set',
        user: smtpUser ? smtpUser.replace(/(.{2}).*(@.*)/, '$1***$2') : 'not_set',
        configured: isConfigured
      },
      connection: {
        status: connectionStatus,
        error: connectionError
      },
      mode: isConfigured ? 'smtp' : 'mock',
      availableTypes: ['welcome', 'password_reset', 'support'],
      testEndpoint: '/api/test-email',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Email status check error:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Test Email Route
app.post('/api/test-email', async (req, res) => {
  try {
    const { sendPasswordResetEmail, sendWelcomeEmail, sendAdminSupportEmail } = require('./services/emailService');
    const { to, type = 'welcome', subject, message } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Email address (to) is required'
      });
    }

    let result = false;
    let emailType = '';

    console.log(`📧 Sending ${type} email to: ${to}`);

    switch (type) {
      case 'welcome':
        result = await sendWelcomeEmail(to, 'Test User');
        emailType = 'Welcome Email';
        break;

      case 'password_reset':
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        result = await sendPasswordResetEmail(to, resetCode);
        emailType = 'Password Reset Email';
        break;

      case 'support':
        const supportResult = await sendAdminSupportEmail(
          subject || 'Test Support Email',
          message || 'This is a test support email sent from the API test route.',
          to
        );
        result = supportResult.success;
        emailType = 'Support Email';
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid email type. Use: welcome, password_reset, or support'
        });
    }

    if (result) {
      res.json({
        success: true,
        message: `${emailType} sent successfully`,
        details: {
          to: to,
          type: type,
          emailType: emailType,
          timestamp: new Date().toISOString(),
          note: 'Email sent via SMTP or logged in console if SMTP not configured'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Failed to send ${emailType.toLowerCase()}`,
        details: {
          to: to,
          type: type,
          emailType: emailType
        }
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
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
app.use('/api/crypto-fees', cryptoFeeRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/flagged-check', flaggedCheckRoutes);
app.use('/api/chains', chainRoutes);
app.use('/api/tokens', tokenRoutes);

async function start() {
  try {
    await connectDB();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}


// For Vercel serverless deployment
if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'serverless') {
  // Connect to DB once for serverless
  connectDB().catch(err => console.error('DB connection error:', err));
} else {
  // Start server normally for local/traditional hosting
  start();
}

// Export app for Vercel (must be at top level)
export default app;
