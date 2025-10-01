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
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
const kucoin_1 = require("../utils/kucoin");
class KuCoinMonitoringService {
    constructor() {
        this.isRunning = false;
        this.monitoringInterval = null;
        this.MONITORING_INTERVAL = 10000; // 10 seconds
        this.EXPIRATION_CHECK_INTERVAL = 30000; // 30 seconds
        this.expirationInterval = null;
    }
    /**
     * Start the monitoring service
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                console.log('⚠️ KuCoin monitoring service is already running');
                return;
            }
            console.log('🚀 Starting KuCoin monitoring service...');
            this.isRunning = true;
            // Start deposit monitoring
            this.monitoringInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.checkDepositsAndProcessSwaps();
                }
                catch (error) {
                    console.error('❌ Error in monitoring cycle:', error.message);
                }
            }), this.MONITORING_INTERVAL);
            // Start expiration checking
            this.expirationInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.checkExpiredExchanges();
                }
                catch (error) {
                    console.error('❌ Error checking expired exchanges:', error.message);
                }
            }), this.EXPIRATION_CHECK_INTERVAL);
            console.log('✅ KuCoin monitoring service started successfully');
            console.log(`🔍 Checking deposits every ${this.MONITORING_INTERVAL / 1000} seconds`);
            console.log(`⏰ Checking expirations every ${this.EXPIRATION_CHECK_INTERVAL / 1000} seconds`);
        });
    }
    /**
     * Stop the monitoring service
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ KuCoin monitoring service is not running');
            return;
        }
        console.log('🛑 Stopping KuCoin monitoring service...');
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        if (this.expirationInterval) {
            clearInterval(this.expirationInterval);
            this.expirationInterval = null;
        }
        this.isRunning = false;
        console.log('✅ KuCoin monitoring service stopped');
    }
    /**
     * Get active user orders from database
     */
    getActiveUserOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const activeExchanges = yield ExchangeHistory_1.default.find({
                    monitoringActive: true,
                    depositReceived: false,
                    kucoinDepositAddress: { $exists: true, $ne: null },
                    expiresAt: { $gt: new Date() }
                }).lean();
                return activeExchanges.map(exchange => ({
                    exchangeId: exchange.exchangeId,
                    fromCurrency: exchange.from.currency,
                    toCurrency: exchange.to.currency,
                    expectedAmount: exchange.from.amount,
                    walletAddress: exchange.walletAddress,
                    depositAddress: exchange.kucoinDepositAddress,
                    expiresAt: exchange.expiresAt
                }));
            }
            catch (error) {
                console.error('❌ Error fetching active orders:', error.message);
                return [];
            }
        });
    }
    /**
     * Main monitoring function to check deposits and process swaps
     */
    checkDepositsAndProcessSwaps() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const timestamp = new Date().toLocaleTimeString();
            console.log(`🔍 [${timestamp}] Checking for new deposits...`);
            // Get active user orders
            const userOrders = yield this.getActiveUserOrders();
            if (userOrders.length === 0) {
                console.log('   No active exchanges to monitor.');
                return;
            }
            console.log(`📋 Monitoring ${userOrders.length} active exchange(s)`);
            // Check for new deposits
            const newDeposits = yield (0, kucoin_1.checkNewDeposits)();
            if (newDeposits.length === 0) {
                console.log('   No new deposits found.');
                return;
            }
            console.log(`🎉 Found ${newDeposits.length} new deposit(s)!`);
            // Process each deposit
            for (const deposit of newDeposits) {
                console.log(`\n💰 Processing deposit:`);
                console.log(`   Amount: ${deposit.amount} ${deposit.currency}`);
                console.log(`   Address: ${deposit.address}`);
                console.log(`   From: ${deposit.from || 'Unknown'}`);
                console.log(`   Time: ${deposit.time.toLocaleString()}`);
                // Find matching user order
                const matchingOrder = userOrders.find(order => order.fromCurrency.toUpperCase() === deposit.currency.toUpperCase() &&
                    order.depositAddress === deposit.address &&
                    Math.abs(order.expectedAmount - deposit.amount) < 0.0001 // Allow small differences due to fees
                );
                if (!matchingOrder) {
                    console.log('⚠️ No matching exchange found for this deposit');
                    continue;
                }
                console.log(`✅ Matched with exchange: ${matchingOrder.exchangeId}`);
                try {
                    // Update exchange status to processing
                    yield this.updateExchangeStatus(matchingOrder.exchangeId, 'processing', {
                        depositTxId: deposit.id,
                        depositAmount: deposit.amount
                    });
                    // Process the swap
                    const swapResult = yield (0, kucoin_1.processSwapOrder)(deposit, matchingOrder.toCurrency, matchingOrder.exchangeId, matchingOrder.walletAddress);
                    if (swapResult.success) {
                        // Update exchange to completed
                        yield this.updateExchangeStatus(matchingOrder.exchangeId, 'completed', {
                            kucoinOrderId: swapResult.orderId,
                            withdrawalTxId: (_a = swapResult.withdrawal) === null || _a === void 0 ? void 0 : _a.withdrawalId
                        });
                        console.log(`✅ Exchange ${matchingOrder.exchangeId} completed successfully!`);
                        // TODO: Send notification to user (webhook, email, etc.)
                        yield this.notifyUser(matchingOrder.exchangeId, 'completed', swapResult);
                    }
                    else {
                        // Update exchange to failed
                        yield this.updateExchangeStatus(matchingOrder.exchangeId, 'failed');
                        console.log(`❌ Exchange ${matchingOrder.exchangeId} failed: ${swapResult.error}`);
                        // TODO: Send failure notification to user
                        yield this.notifyUser(matchingOrder.exchangeId, 'failed', { error: swapResult.error });
                    }
                }
                catch (error) {
                    console.error(`❌ Error processing exchange ${matchingOrder.exchangeId}:`, error.message);
                    yield this.updateExchangeStatus(matchingOrder.exchangeId, 'failed');
                    yield this.notifyUser(matchingOrder.exchangeId, 'failed', { error: error.message });
                }
            }
        });
    }
    /**
     * Check for expired exchanges and mark them as expired
     */
    checkExpiredExchanges() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = new Date();
                const expiredExchanges = yield ExchangeHistory_1.default.find({
                    monitoringActive: true,
                    depositReceived: false,
                    expiresAt: { $lte: now }
                });
                if (expiredExchanges.length === 0) {
                    return;
                }
                console.log(`⏰ Found ${expiredExchanges.length} expired exchange(s)`);
                for (const exchange of expiredExchanges) {
                    console.log(`⏰ Expiring exchange: ${exchange.exchangeId}`);
                    yield this.updateExchangeStatus(exchange.exchangeId, 'expired');
                    // TODO: Send expiration notification to user
                    yield this.notifyUser(exchange.exchangeId, 'expired', {
                        message: 'Exchange expired - no deposit received within 5 minutes'
                    });
                }
            }
            catch (error) {
                console.error('❌ Error checking expired exchanges:', error.message);
            }
        });
    }
    /**
     * Update exchange status in database
     */
    updateExchangeStatus(exchangeId_1, status_1) {
        return __awaiter(this, arguments, void 0, function* (exchangeId, status, additionalData = {}) {
            try {
                const updateData = Object.assign({ status }, additionalData);
                // Update monitoring and completion flags based on status
                if (status === 'processing') {
                    updateData.depositReceived = true;
                }
                else if (status === 'completed') {
                    updateData.swapCompleted = true;
                    updateData.monitoringActive = false;
                }
                else if (status === 'failed' || status === 'expired') {
                    updateData.monitoringActive = false;
                }
                yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, updateData, { new: true });
                console.log(`📝 Updated exchange ${exchangeId} status to: ${status}`);
            }
            catch (error) {
                console.error(`❌ Error updating exchange ${exchangeId}:`, error.message);
            }
        });
    }
    /**
     * Send notification to user (placeholder for webhook/email integration)
     */
    notifyUser(exchangeId, status, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implement actual notification system
            // This could include:
            // - Webhook calls to frontend
            // - Email notifications
            // - SMS notifications
            // - Push notifications
            console.log(`📧 [NOTIFICATION] Exchange ${exchangeId} - Status: ${status}`);
            console.log(`📧 [NOTIFICATION] Data:`, JSON.stringify(data, null, 2));
            // For now, just log the notification
            // In production, you would implement actual notification delivery
        });
    }
    /**
     * Get service status
     */
    getStatus() {
        return {
            isRunning: this.isRunning
        };
    }
    /**
     * Get monitoring statistics
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [activeExchanges, processingExchanges, completedToday, failedToday] = yield Promise.all([
                    ExchangeHistory_1.default.countDocuments({ monitoringActive: true, depositReceived: false }),
                    ExchangeHistory_1.default.countDocuments({ status: 'processing' }),
                    ExchangeHistory_1.default.countDocuments({
                        status: 'completed',
                        date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                    }),
                    ExchangeHistory_1.default.countDocuments({
                        status: 'failed',
                        date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                    })
                ]);
                return {
                    isRunning: this.isRunning,
                    activeExchanges,
                    processingExchanges,
                    completedToday,
                    failedToday,
                    uptime: this.isRunning ? 'Running' : 'Stopped'
                };
            }
            catch (error) {
                console.error('❌ Error getting stats:', error.message);
                return {
                    isRunning: this.isRunning,
                    error: error.message
                };
            }
        });
    }
}
// Create singleton instance
const kucoinMonitoringService = new KuCoinMonitoringService();
exports.default = kucoinMonitoringService;
