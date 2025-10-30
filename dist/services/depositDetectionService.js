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
exports.depositDetectionService = void 0;
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
const logger_1 = require("../utils/logger");
/**
 * Deposit Detection Service
 * Monitors blockchain addresses for incoming deposits
 */
class DepositDetectionService {
    constructor() {
        this.monitoredAddresses = new Map();
        this.monitoringInterval = null;
        this.isRunning = false;
        logger_1.logger.info('🔍 Deposit detection service initialized');
    }
    /**
     * Start monitoring for deposits
     */
    startMonitoring() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                logger_1.logger.warn('Deposit monitoring already running');
                return;
            }
            this.isRunning = true;
            logger_1.logger.info('🚀 Starting deposit monitoring service');
            // Load active exchanges from database
            yield this.loadActiveExchanges();
            // Check for deposits every 30 seconds
            this.monitoringInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                yield this.checkForDeposits();
            }), 30000);
            // Check immediately
            this.checkForDeposits();
        });
    }
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            this.isRunning = false;
            logger_1.logger.info('🛑 Deposit monitoring stopped');
        }
    }
    /**
     * Add address to monitoring
     */
    addMonitoredAddress(exchangeId, address, currency, expectedAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            const monitored = {
                exchangeId,
                address,
                currency,
                expectedAmount,
                addedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            };
            this.monitoredAddresses.set(exchangeId, monitored);
            logger_1.logger.info(`📍 Monitoring address for ${exchangeId}: ${address} (${currency})`);
            // Start monitoring if not running
            if (!this.isRunning) {
                yield this.startMonitoring();
            }
        });
    }
    /**
     * Load active exchanges from database
     */
    loadActiveExchanges() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const activeExchanges = yield ExchangeHistory_1.default.find({
                    status: { $in: ['pending', 'processing'] },
                    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
                });
                logger_1.logger.info(`📊 Loaded ${activeExchanges.length} active exchanges for monitoring`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to load active exchanges: ${error.message}`);
            }
        });
    }
    /**
     * Check for deposits (placeholder - implement blockchain monitoring)
     */
    checkForDeposits() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.monitoredAddresses.size === 0) {
                return;
            }
            logger_1.logger.info(`🔍 Checking ${this.monitoredAddresses.size} monitored addresses`);
            // Clean up expired addresses
            this.cleanupExpiredAddresses();
            // TODO: Implement actual blockchain monitoring
            // For now, this is a placeholder for manual processing
        });
    }
    /**
     * Clean up expired addresses
     */
    cleanupExpiredAddresses() {
        const now = new Date();
        const expired = [];
        for (const [exchangeId, monitored] of this.monitoredAddresses) {
            if (monitored.expiresAt < now) {
                expired.push(exchangeId);
            }
        }
        for (const exchangeId of expired) {
            this.monitoredAddresses.delete(exchangeId);
            logger_1.logger.info(`⏰ Removed expired monitoring for ${exchangeId}`);
        }
    }
    /**
     * Get monitoring status
     */
    getMonitoringStatus() {
        return {
            isRunning: this.isRunning,
            monitoredAddresses: this.monitoredAddresses.size,
            addresses: Array.from(this.monitoredAddresses.values()).map(m => ({
                exchangeId: m.exchangeId,
                address: m.address,
                currency: m.currency,
                expectedAmount: m.expectedAmount
            }))
        };
    }
}
exports.depositDetectionService = new DepositDetectionService();
exports.default = exports.depositDetectionService;
