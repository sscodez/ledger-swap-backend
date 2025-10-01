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
const authMiddleware_1 = require("../middleware/authMiddleware");
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
const kucoin_1 = require("../utils/kucoin");
const router = express_1.default.Router();
/**
 * GET /api/kucoin/status
 * Get monitoring service status (admin only)
 */
router.get('/status', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
router.post('/start', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
router.post('/stop', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
router.get('/addresses', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
router.get('/exchanges/active', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
router.get('/exchanges/expired', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
router.post('/exchanges/:exchangeId/retry', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            error: error.message
        });
    }
}));
/**
 * GET /api/kucoin/supported-currencies
 * Get supported currencies for KuCoin integration (public)
 */
router.get('/supported-currencies', (req, res) => {
    res.json({
        message: 'Supported currencies retrieved successfully',
        currencies: Object.keys(kucoin_1.SUPPORTED_CHAINS),
        chains: kucoin_1.SUPPORTED_CHAINS
    });
});
exports.default = router;
