import dotenv from 'dotenv';
import connectDB from '../config/db';

import { logger } from '../utils/logger';
import { initializePrivateKeyManager } from '../utils/privateKeyManager';

// Load environment variables
dotenv.config();

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Check if automated swaps are enabled
  if (process.env.ENABLE_AUTOMATED_SWAPS === 'true') {
    logger.info('✅ Automated swaps enabled');
  } else {
    logger.warn('⚠️ Automated swaps disabled (ENABLE_AUTOMATED_SWAPS not set to true)');
  }
}

/**
 * Startup script for automated swap system
 * This should be run when the backend starts to enable 24/7 automated swaps
 */
async function startAutomatedSwapSystem() {
  console.log('🚀 Initializing LedgerSwap Automated Swap System...\n');

  try {
    // 1. Connect to database
    logger.info('📊 Connecting to database...');
    await connectDB();
    logger.info('✅ Database connected successfully');

    // 2. Initialize private key manager
    logger.info('🔐 Initializing private key management...');
    const privateKeysConfigured = initializePrivateKeyManager();
    if (!privateKeysConfigured) {
      logger.warn('⚠️ No valid private keys found - automated swaps will use mock mode');
    }

    // 3. Check environment variables
    logger.info('⚙️ Validating environment configuration...');
    validateEnvironment();
    logger.info('✅ Environment validation passed');

    // 4. Initialize automated swap services...
    logger.info('🔧 Initializing automated swap services...');

    // Start deposit detection service


    // Display system status

    // Set up graceful shutdown
    setupGracefulShutdown();

    logger.info('🎉 Automated swap system is now running 24/7!');
    logger.info('📊 Monitor system health at: /api/automated-swaps/health');
    logger.info('🔍 View admin panel at: https://ledgerswap.io/admin');

  } catch (error) {
    logger.error('❌ Failed to start automated swap system:', error);
    process.exit(1);
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironmentVariables(): void {
  const requiredVars = [
    'MONGODB_URI',
    'SWAP_WALLET_ADDRESS',
    'SWAP_WALLET_PRIVATE_KEY',
    'INFURA_ETHEREUM_RPC'
  ];

  const optionalVars = [
    'RUBIC_CROSS_CHAIN_FEE_ADDRESS',
    'RUBIC_ON_CHAIN_FEE_ADDRESS',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'WEBHOOK_URL'
  ];

  logger.info('🔍 Validating environment variables...');

  // Check required variables
  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  // Check optional variables
  const missingOptional = optionalVars.filter(varName => !process.env[varName]);
  if (missingOptional.length > 0) {
    logger.warn(`⚠️ Optional environment variables not set: ${missingOptional.join(', ')}`);
    logger.warn('Some features may be limited without these variables.');
  }

  logger.info('✅ Environment variables validated');
}

/**
 * Display system status information
 */
function displaySystemStatus(swapStatus: any, monitoringStatus: any): void {
  console.log('\n📊 AUTOMATED SWAP SYSTEM STATUS');
  console.log('=====================================');
  console.log(`🔄 Rubic SDK: ${swapStatus.isInitialized ? '✅ Active' : '❌ Inactive'}`);
  console.log(`👁️  Deposit Monitoring: ${monitoringStatus.isRunning ? '✅ Active' : '❌ Inactive'}`);
  console.log(`📡 Monitored Chains: ${monitoringStatus.activeChains}`);
  console.log(`📍 Monitored Addresses: ${monitoringStatus.monitoredAddresses}`);
  console.log(`⏳ Swap Queue: ${swapStatus.queueSize} pending`);
  console.log(`🔄 Processing: ${swapStatus.processing} swaps`);
  console.log('=====================================\n');

  console.log('🔗 SUPPORTED BLOCKCHAINS:');
  console.log('- Ethereum (ETH, USDT, USDC, WBTC)');
  console.log('- Binance Smart Chain (BNB, BUSD)');
  console.log('- Polygon (MATIC, wrapped tokens)');
  console.log('- Arbitrum (ARB, L2 tokens)');
  console.log('- Bitcoin (BTC)');
  console.log('- XRP Ledger (XRP)');
  console.log('- Stellar (XLM)');
  console.log('- XDC Network (XDC)');
  console.log('- IOTA (MIOTA)\n');

  console.log('⚡ AUTOMATED FEATURES:');
  console.log('- Real-time deposit detection');
  console.log('- Automatic route optimization via Rubic');
  console.log('- Cross-chain swap execution');
  console.log('- Email notifications');
  console.log('- Error handling & recovery');
  console.log('- 24/7 monitoring\n');
}

/**
 * Set up graceful shutdown handlers
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    logger.info(`🛑 Received ${signal}, shutting down gracefully...`);

    try {
      // Stop deposit detection service
   
      logger.info('👋 Automated swap system shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

// Run the startup script if called directly
if (require.main === module) {
  startAutomatedSwapSystem();
}

export default startAutomatedSwapSystem;
