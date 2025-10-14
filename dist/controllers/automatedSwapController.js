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
exports.getSystemHealth = exports.getSwapQueue = exports.addMonitoredAddress = exports.testAutomatedSwap = exports.triggerManualSwap = exports.getAutomatedSwapStatus = exports.stopAutomatedSwaps = exports.startAutomatedSwaps = void 0;
const automatedSwapService_1 = require("../services/automatedSwapService");
const depositDetectionService_1 = require("../services/depositDetectionService");
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
const logger_1 = require("../utils/logger");
/**
 * Start automated swap monitoring system
 */
const startAutomatedSwaps = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        logger_1.logger.info('🚀 Starting automated swap system...');
        // Start deposit detection service
        yield depositDetectionService_1.depositDetectionService.startMonitoring();
        // Get system status
        const swapStatus = automatedSwapService_1.automatedSwapService.getSwapQueueStatus();
        const monitoringStatus = depositDetectionService_1.depositDetectionService.getMonitoringStatus();
        res.json({
            message: 'Automated swap system started successfully',
            status: 'running',
            swapService: swapStatus,
            depositMonitoring: monitoringStatus,
            timestamp: new Date().toISOString()
        });
        logger_1.logger.info('✅ Automated swap system started successfully');
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to start automated swap system:', error);
        res.status(500).json({
            message: 'Failed to start automated swap system',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.startAutomatedSwaps = startAutomatedSwaps;
/**
 * Stop automated swap monitoring system
 */
const stopAutomatedSwaps = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        logger_1.logger.info('🛑 Stopping automated swap system...');
        // Stop deposit detection service
        yield depositDetectionService_1.depositDetectionService.stopMonitoring();
        res.json({
            message: 'Automated swap system stopped successfully',
            status: 'stopped',
            timestamp: new Date().toISOString()
        });
        logger_1.logger.info('✅ Automated swap system stopped successfully');
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to stop automated swap system:', error);
        res.status(500).json({
            message: 'Failed to stop automated swap system',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.stopAutomatedSwaps = stopAutomatedSwaps;
/**
 * Get automated swap system status
 */
const getAutomatedSwapStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const swapStatus = automatedSwapService_1.automatedSwapService.getSwapQueueStatus();
        const monitoringStatus = depositDetectionService_1.depositDetectionService.getMonitoringStatus();
        // Get recent swap statistics
        const stats = yield getSwapStatistics();
        res.json({
            status: monitoringStatus.isRunning ? 'running' : 'stopped',
            swapService: swapStatus,
            depositMonitoring: monitoringStatus,
            statistics: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Error getting automated swap status:', error);
        res.status(500).json({
            message: 'Failed to get system status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getAutomatedSwapStatus = getAutomatedSwapStatus;
/**
 * Trigger manual swap execution (for testing/admin)
 */
const triggerManualSwap = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { exchangeId } = req.params;
        if (!exchangeId) {
            return res.status(400).json({
                message: 'Exchange ID is required'
            });
        }
        logger_1.logger.info(`🔧 Manual swap trigger requested for exchange: ${exchangeId}`);
        // Execute manual swap
        yield automatedSwapService_1.automatedSwapService.executeManualSwap(exchangeId);
        res.json({
            message: 'Manual swap executed successfully',
            exchangeId,
            timestamp: new Date().toISOString()
        });
        logger_1.logger.info(`✅ Manual swap completed for ${exchangeId}`);
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to execute manual swap:', error);
        res.status(500).json({
            message: 'Failed to execute manual swap',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.triggerManualSwap = triggerManualSwap;
/**
 * Test automated swap system with mock deposit
 */
const testAutomatedSwap = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { exchangeId } = req.params;
        const { amount, currency, txHash } = req.body;
        if (!exchangeId) {
            return res.status(400).json({
                message: 'Exchange ID is required'
            });
        }
        logger_1.logger.info(`🧪 Testing automated swap for exchange: ${exchangeId}`);
        // Get exchange details
        const exchange = yield ExchangeHistory_1.default.findOne({ exchangeId });
        if (!exchange) {
            return res.status(404).json({
                message: 'Exchange not found'
            });
        }
        // Create mock deposit event
        const mockDepositEvent = {
            exchangeId: exchange.exchangeId,
            txHash: txHash || `test_tx_${Date.now()}`,
            fromAddress: 'test_wallet_address',
            toAddress: exchange.kucoinDepositAddress || 'test_deposit_address',
            amount: (amount || exchange.from.amount).toString(),
            token: (currency || exchange.from.currency).toUpperCase(),
            chain: 'ethereum',
            blockNumber: Date.now(),
            confirmations: 12
        };
        // Process the mock deposit
        yield automatedSwapService_1.automatedSwapService.processDeposit(mockDepositEvent);
        res.json({
            message: 'Test automated swap triggered successfully',
            exchangeId,
            mockDeposit: mockDepositEvent,
            timestamp: new Date().toISOString()
        });
        logger_1.logger.info(`✅ Test automated swap completed for ${exchangeId}`);
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to test automated swap:', error);
        res.status(500).json({
            message: 'Failed to test automated swap',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.testAutomatedSwap = testAutomatedSwap;
/**
 * Add address to monitoring (for new exchanges)
 */
const addMonitoredAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { address, exchangeId, currency, expectedAmount, expiresAt } = req.body;
        if (!address || !exchangeId || !currency || !expectedAmount) {
            return res.status(400).json({
                message: 'Missing required fields: address, exchangeId, currency, expectedAmount'
            });
        }
        const expirationDate = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 60 * 1000);
        yield depositDetectionService_1.depositDetectionService.addMonitoredAddress(address, exchangeId, currency, expectedAmount, expirationDate);
        res.json({
            message: 'Address added to monitoring successfully',
            address,
            exchangeId,
            expiresAt: expirationDate.toISOString()
        });
        logger_1.logger.info(`👁️ Added address ${address} to monitoring for exchange ${exchangeId}`);
    }
    catch (error) {
        logger_1.logger.error('❌ Error adding monitored address:', error);
        res.status(500).json({
            message: 'Failed to add monitored address',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.addMonitoredAddress = addMonitoredAddress;
/**
 * Get swap queue information
 */
const getSwapQueue = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const queueStatus = automatedSwapService_1.automatedSwapService.getSwapQueueStatus();
        // Get pending exchanges from database
        const pendingExchanges = yield ExchangeHistory_1.default.find({
            status: { $in: ['pending', 'processing'] },
            monitoringActive: true
        }).select('exchangeId from to status createdAt expiresAt');
        res.json({
            queue: queueStatus,
            pendingExchanges: pendingExchanges.map(exchange => ({
                exchangeId: exchange.exchangeId,
                from: exchange.from,
                to: exchange.to,
                status: exchange.status,
                createdAt: exchange.createdAt,
                expiresAt: exchange.expiresAt
            })),
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Error getting swap queue:', error);
        res.status(500).json({
            message: 'Failed to get swap queue',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getSwapQueue = getSwapQueue;
/**
 * Get swap statistics
 */
function getSwapStatistics() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const now = new Date();
            const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
            const [totalSwaps, completedSwaps, failedSwaps, swapsLast24h, swapsLastHour, processingSwaps] = yield Promise.all([
                ExchangeHistory_1.default.countDocuments({}),
                ExchangeHistory_1.default.countDocuments({ status: 'completed' }),
                ExchangeHistory_1.default.countDocuments({ status: 'failed' }),
                ExchangeHistory_1.default.countDocuments({ createdAt: { $gte: last24Hours } }),
                ExchangeHistory_1.default.countDocuments({ createdAt: { $gte: lastHour } }),
                ExchangeHistory_1.default.countDocuments({ status: 'processing' })
            ]);
            // Calculate success rate
            const successRate = totalSwaps > 0 ? (completedSwaps / totalSwaps * 100).toFixed(2) : '0';
            return {
                total: totalSwaps,
                completed: completedSwaps,
                failed: failedSwaps,
                processing: processingSwaps,
                successRate: `${successRate}%`,
                last24Hours: swapsLast24h,
                lastHour: swapsLastHour
            };
        }
        catch (error) {
            logger_1.logger.error('❌ Error calculating swap statistics:', error);
            return {
                total: 0,
                completed: 0,
                failed: 0,
                processing: 0,
                successRate: '0%',
                last24Hours: 0,
                lastHour: 0
            };
        }
    });
}
/**
 * Get system health check
 */
const getSystemHealth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const swapStatus = automatedSwapService_1.automatedSwapService.getSwapQueueStatus();
        const monitoringStatus = depositDetectionService_1.depositDetectionService.getMonitoringStatus();
        const stats = yield getSwapStatistics();
        // Check if system is healthy
        const isHealthy = swapStatus.isInitialized && monitoringStatus.isRunning;
        const healthStatus = isHealthy ? 'healthy' : 'unhealthy';
        res.json({
            status: healthStatus,
            services: {
                rubicSDK: {
                    status: swapStatus.isInitialized ? 'active' : 'inactive',
                    description: 'Rubic SDK for automated swaps'
                },
                depositMonitoring: {
                    status: monitoringStatus.isRunning ? 'active' : 'inactive',
                    description: 'Blockchain deposit detection'
                },
                swapQueue: {
                    status: 'active',
                    queueSize: swapStatus.queueSize,
                    processing: swapStatus.processing
                }
            },
            statistics: stats,
            monitoredChains: monitoringStatus.activeChains,
            monitoredAddresses: monitoringStatus.monitoredAddresses,
            timestamp: new Date().toISOString()
        });
        // Set appropriate HTTP status
        res.status(isHealthy ? 200 : 503);
    }
    catch (error) {
        logger_1.logger.error('❌ Error getting system health:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
exports.getSystemHealth = getSystemHealth;
