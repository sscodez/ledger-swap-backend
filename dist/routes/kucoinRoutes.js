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
const express_1 = __importDefault(require("express"));
const kucoinMonitoringService_1 = __importDefault(require("../services/kucoinMonitoringService"));
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
const kucoin_1 = require("../utils/kucoin");
const router = express_1.default.Router();
/**
 * GET /api/kucoin/status
 * Get monitoring service status (admin only)
 */
router.get('/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield kucoinMonitoringService_1.default.getStats();
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({
            message: 'Failed to get service status',
            error: error.message
        });
    }
}));
/**
 * POST /api/kucoin/start
 * Start monitoring service (admin only)
 */
router.post('/start', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield kucoinMonitoringService_1.default.start();
        res.json({
            message: 'KuCoin monitoring service started successfully',
            status: 'running'
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'Failed to start monitoring service',
            error: error.message
        });
    }
}));
/**
 * POST /api/kucoin/stop
 * Stop monitoring service (admin only)
 */
router.post('/stop', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        kucoinMonitoringService_1.default.stop();
        res.json({
            message: 'KuCoin monitoring service stopped successfully',
            status: 'stopped'
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'Failed to stop monitoring service',
            error: error.message
        });
    }
}));
/**
 * GET /api/kucoin/addresses
 * Get all deposit addresses (admin only)
 */
router.get('/addresses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const addresses = yield (0, kucoin_1.initializeDepositAddresses)();
        res.json({
            message: 'Deposit addresses retrieved successfully',
            addresses,
            supportedChains: kucoin_1.SUPPORTED_CHAINS
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'Failed to get deposit addresses',
            error: error.message
        });
    }
}));
/**
 * GET /api/kucoin/exchanges/active
 * Get active exchanges being monitored (admin only)
 */
router.get('/exchanges/active', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const activeExchanges = yield ExchangeHistory_1.default.find({
            monitoringActive: true,
            depositReceived: false,
            kucoinDepositAddress: { $exists: true, $ne: null }
        }).sort({ date: -1 });
        res.json({
            message: 'Active exchanges retrieved successfully',
            count: activeExchanges.length,
            exchanges: activeExchanges
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'Failed to get active exchanges',
            error: error.message
        });
    }
}));
/**
 * GET /api/kucoin/exchanges/expired
 * Get expired exchanges (admin only)
 */
router.get('/exchanges/expired', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const expiredExchanges = yield ExchangeHistory_1.default.find({
            status: 'expired'
        }).sort({ date: -1 }).limit(50);
        res.json({
            message: 'Expired exchanges retrieved successfully',
            count: expiredExchanges.length,
            exchanges: expiredExchanges
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'Failed to get expired exchanges',
            error: error.message
        });
    }
}));
/**
 * POST /api/kucoin/exchanges/:exchangeId/retry
 * Retry a failed exchange (admin only)
 */
router.post('/exchanges/:exchangeId/retry', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { exchangeId } = req.params;
        const exchange = yield ExchangeHistory_1.default.findOne({ exchangeId });
        if (!exchange) {
            return res.status(404).json({ message: 'Exchange not found' });
        }
        if (exchange.status !== 'failed' && exchange.status !== 'expired') {
            return res.status(400).json({
                message: 'Can only retry failed or expired exchanges',
                currentStatus: exchange.status
            });
        }
        // Reset exchange for retry
        const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, {
            status: 'pending',
            monitoringActive: true,
            depositReceived: false,
            swapCompleted: false,
            expiresAt: newExpiresAt,
            kucoinOrderId: undefined,
            depositTxId: undefined,
            withdrawalTxId: undefined,
            depositAmount: undefined
        });
        res.json({
            message: 'Exchange retry initiated successfully',
            exchangeId,
            newExpiresAt: newExpiresAt.toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'Failed to retry exchange',
        });
    }
}));
/**
 * POST /api/kucoin/create-deposit-address
 * Create a single deposit address for specified currency and chain
 */
router.post('/create-deposit-address', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { currency, chain, to = 'main' } = req.body;
        if (!currency || !chain) {
            return res.status(400).json({
                message: 'Currency and chain are required',
                example: {
                    currency: 'BTC',
                    chain: 'btc',
                    to: 'main'
                },
                supportedChains: kucoin_1.SUPPORTED_CHAINS
            });
        }
        console.log(`🏗️ Creating deposit address for ${currency} on ${chain} chain...`);
        const result = yield (0, kucoin_1.getOrCreateDepositAddress)(currency, chain);
        if (result) {
            res.json({
                message: 'Deposit address created successfully',
                data: {
                    address: result.address,
                    memo: result.memo || '',
                    chainId: result.chain || chain,
                    to: to.toUpperCase(),
                    expirationDate: 0,
                    currency: currency,
                    chainName: currency
                },
                kucoinResponse: result
            });
        }
        else {
            res.status(500).json({
                message: 'Failed to create deposit address',
                currency,
                chain
            });
        }
    }
    catch (error) {
        console.error('❌ Create deposit address error:', error);
        res.status(500).json({
            message: 'Error creating deposit address',
            error: error.message,
            details: ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || null
        });
    }
}));
/**
 * POST /api/kucoin/create-all-addresses
 * Create deposit addresses for all supported currencies
 */
router.post('/create-all-addresses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🚀 Starting bulk deposit address creation...');
        const addresses = yield (0, kucoin_1.initializeDepositAddresses)();
        const successful = Object.keys(addresses).filter(k => addresses[k].address);
        const failed = Object.keys(addresses).filter(k => addresses[k].error);
        res.json({
            message: 'Deposit address creation completed',
            summary: {
                total: Object.keys(kucoin_1.SUPPORTED_CHAINS).length,
                successful: successful.length,
                failed: failed.length,
                successfulCurrencies: successful,
                failedCurrencies: failed
            },
            addresses,
            supportedChains: kucoin_1.SUPPORTED_CHAINS
        });
    }
    catch (error) {
        console.error('❌ Bulk address creation failed:', error);
        res.status(500).json({
            message: 'Failed to create deposit addresses',
            error: error.message
        });
    }
}));
/**
 * GET /api/kucoin/supported-currencies
 * Get supported currencies for KuCoin integration
 */
router.get('/supported-currencies', (req, res) => {
    res.json({
        message: 'Supported currencies retrieved successfully',
        currencies: Object.keys(kucoin_1.SUPPORTED_CHAINS),
        chains: kucoin_1.SUPPORTED_CHAINS
    });
});
/**
 * GET /api/kucoin/test-connection
 * Test KuCoin API connection (admin only)
 */
router.get('/test-connection', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        console.log('🧪 Testing KuCoin API connection...');
        // Check environment variables
        const hasCredentials = !!(process.env.KUCOIN_API_KEY && process.env.KUCOIN_API_SECRET && process.env.KUCOIN_API_PASSPHRASE);
        console.log('🔑 API Credentials check:', {
            hasApiKey: !!process.env.KUCOIN_API_KEY,
            hasApiSecret: !!process.env.KUCOIN_API_SECRET,
            hasPassphrase: !!process.env.KUCOIN_API_PASSPHRASE,
            apiKeyLength: ((_a = process.env.KUCOIN_API_KEY) === null || _a === void 0 ? void 0 : _a.length) || 0
        });
        if (!hasCredentials) {
            return res.status(400).json({
                message: 'KuCoin API credentials not configured',
                missing: {
                    apiKey: !process.env.KUCOIN_API_KEY,
                    apiSecret: !process.env.KUCOIN_API_SECRET,
                    passphrase: !process.env.KUCOIN_API_PASSPHRASE
                }
            });
        }
        // Test basic API call - get account info
        const { kucoinRequest } = require('../utils/kucoin');
        const accountInfo = yield kucoinRequest('GET', '/api/v1/accounts');
        res.json({
            message: 'KuCoin API connection successful',
            hasCredentials,
            accountsCount: ((_b = accountInfo === null || accountInfo === void 0 ? void 0 : accountInfo.data) === null || _b === void 0 ? void 0 : _b.length) || 0,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ KuCoin connection test failed:', error);
        res.status(500).json({
            message: 'KuCoin API connection failed',
            error: error.message,
            details: ((_c = error.response) === null || _c === void 0 ? void 0 : _c.data) || null
        });
    }
}));
/**
 * POST /api/kucoin/test-deposit-address
 * Test deposit address generation (admin only)
 */
router.post('/test-deposit-address', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currency, chain } = req.body;
        if (!currency || !chain) {
            return res.status(400).json({
                message: 'Currency and chain are required',
                example: { currency: 'BTC', chain: 'btc' }
            });
        }
        console.log(`🧪 Testing deposit address generation for ${currency} on ${chain}`);
        const result = yield (0, kucoin_1.getOrCreateDepositAddress)(currency, chain);
        if (result) {
            res.json({
                message: 'Deposit address generated successfully',
                address: result.address,
                currency: result.currency,
                chain: result.chain,
                result
            });
        }
        else {
            res.status(500).json({
                message: 'Failed to generate deposit address',
                currency,
                chain
            });
        }
    }
    catch (error) {
        console.error('❌ Test deposit address error:', error);
        res.status(500).json({
            message: 'Error testing deposit address generation',
            error: error.message
        });
    }
}));
exports.default = router;
