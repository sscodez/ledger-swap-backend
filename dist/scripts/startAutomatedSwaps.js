"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("../config/db"));
const automatedSwapService_1 = require("../services/automatedSwapService");
const depositDetectionService_1 = require("../services/depositDetectionService");
const logger_1 = require("../utils/logger");
const privateKeyManager_1 = require("../utils/privateKeyManager");
// Load environment variables
dotenv_1.default.config();
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
        logger_1.logger.info('✅ Automated swaps enabled');
    }
    else {
        logger_1.logger.warn('⚠️ Automated swaps disabled (ENABLE_AUTOMATED_SWAPS not set to true)');
    }
}
/**
 * Startup script for automated swap system
 * This should be run when the backend starts to enable 24/7 automated swaps
 */
function startAutomatedSwapSystem() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Initializing LedgerSwap Automated Swap System...\n');
        try {
            // 1. Connect to database
            logger_1.logger.info('📊 Connecting to database...');
            yield (0, db_1.default)();
            logger_1.logger.info('✅ Database connected successfully');
            // 2. Initialize private key manager
            logger_1.logger.info('🔐 Initializing private key management...');
            const privateKeysConfigured = (0, privateKeyManager_1.initializePrivateKeyManager)();
            if (!privateKeysConfigured) {
                logger_1.logger.warn('⚠️ No valid private keys found - automated swaps will use mock mode');
            }
            // 3. Check environment variables
            logger_1.logger.info('⚙️ Validating environment configuration...');
            validateEnvironment();
            logger_1.logger.info('✅ Environment validation passed');
            // 4. Initialize automated swap services...
            logger_1.logger.info('🔧 Initializing automated swap services...');
            // Start deposit detection service
            yield depositDetectionService_1.depositDetectionService.startMonitoring();
            logger_1.logger.info('✅ deposit detection service started');
            const swapStatus = automatedSwapService_1.automatedSwapService.getSwapQueueStatus();
            const monitoringStatus = depositDetectionService_1.depositDetectionService.getMonitoringStatus();
            // Display system status
            displaySystemStatus(swapStatus, monitoringStatus);
            // Set up graceful shutdown
            setupGracefulShutdown();
            logger_1.logger.info('🎉 Automated swap system is now running 24/7!');
            logger_1.logger.info('📊 Monitor system health at: /api/automated-swaps/health');
            logger_1.logger.info('🔍 View admin panel at: https://ledgerswap.io/admin');
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to start automated swap system:', error);
            process.exit(1);
        }
    });
}
/**
 * Validate required environment variables
 */
function validateEnvironmentVariables() {
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
    logger_1.logger.info('🔍 Validating environment variables...');
    // Check required variables
    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        logger_1.logger.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        logger_1.logger.error('Please check your .env file and ensure all required variables are set.');
        process.exit(1);
    }
    // Check optional variables
    const missingOptional = optionalVars.filter(varName => !process.env[varName]);
    if (missingOptional.length > 0) {
        logger_1.logger.warn(`⚠️ Optional environment variables not set: ${missingOptional.join(', ')}`);
        logger_1.logger.warn('Some features may be limited without these variables.');
    }
    logger_1.logger.info('✅ Environment variables validated');
}
/**
 * Display system status information
 */
function displaySystemStatus(swapStatus, monitoringStatus) {
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
function setupGracefulShutdown() {
    const shutdown = (signal) => __awaiter(this, void 0, void 0, function* () {
        logger_1.logger.info(`🛑 Received ${signal}, shutting down gracefully...`);
        try {
            // Stop deposit detection service
            yield depositDetectionService_1.depositDetectionService.stopMonitoring();
            logger_1.logger.info('✅ Deposit detection service stopped');
            logger_1.logger.info('👋 Automated swap system shutdown complete');
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    });
    // Handle different shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger_1.logger.error('💥 Uncaught Exception:', error);
        shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
        logger_1.logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
        shutdown('unhandledRejection');
    });
}
// Run the startup script if called directly
if (require.main === module) {
    startAutomatedSwapSystem();
}
exports.default = startAutomatedSwapSystem;
