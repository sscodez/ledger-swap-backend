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
exports.automatedSwapService = void 0;
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
const logger_1 = require("../utils/logger");
/**
 * Automated Swap Service
 * Simple queue-based swap processing without external dependencies
 */
class AutomatedSwapService {
    constructor() {
        this.swapQueue = [];
        this.isProcessing = false;
        this.processingInterval = null;
        logger_1.logger.info('🤖 Automated Swap Service initialized');
    }
    /**
     * Add exchange to swap queue
     */
    addToQueue(exchangeId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const exchange = yield ExchangeHistory_1.default.findOne({ exchangeId });
                if (!exchange) {
                    logger_1.logger.error(`Exchange ${exchangeId} not found`);
                    return;
                }
                const queueItem = {
                    exchangeId,
                    fromCurrency: exchange.from.currency,
                    toCurrency: exchange.to.currency,
                    amount: exchange.from.amount,
                    recipientAddress: exchange.walletAddress || '',
                    priority: 1,
                    addedAt: new Date()
                };
                this.swapQueue.push(queueItem);
                logger_1.logger.info(`✅ Added exchange ${exchangeId} to swap queue`);
                // Start processing if not already running
                if (!this.isProcessing) {
                    this.startProcessing();
                }
            }
            catch (error) {
                logger_1.logger.error(`Failed to add exchange to queue: ${error.message}`);
            }
        });
    }
    /**
     * Start processing swap queue
     */
    startProcessing() {
        if (this.processingInterval)
            return;
        this.isProcessing = true;
        logger_1.logger.info('🚀 Starting swap queue processing');
        this.processingInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield this.processNextSwap();
        }), 10000); // Process every 10 seconds
        // Process immediately
        this.processNextSwap();
    }
    /**
     * Process next swap in queue
     */
    processNextSwap() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.swapQueue.length === 0) {
                return;
            }
            const swap = this.swapQueue.shift();
            if (!swap)
                return;
            try {
                logger_1.logger.info(`🔄 Processing swap for ${swap.exchangeId}`);
                logger_1.logger.info(`   ${swap.amount} ${swap.fromCurrency} → ${swap.toCurrency}`);
                // Update status to processing
                yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: swap.exchangeId }, {
                    status: 'processing',
                    notes: 'Swap in progress - manual processing required'
                });
                // Mark for manual review (no automatic swap execution)
                yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: swap.exchangeId }, {
                    status: 'in_review',
                    notes: 'Ready for manual swap execution by admin'
                });
                logger_1.logger.info(`✅ Exchange ${swap.exchangeId} marked for manual processing`);
            }
            catch (error) {
                logger_1.logger.error(`❌ Failed to process ${swap.exchangeId}: ${error.message}`);
                yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: swap.exchangeId }, {
                    status: 'failed',
                    errorMessage: error.message,
                    notes: 'Processing failed - admin intervention required'
                });
            }
        });
    }
    /**
     * Stop processing
     */
    stop() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
            this.isProcessing = false;
            logger_1.logger.info('🛑 Swap processing stopped');
        }
    }
    /**
     * Get queue status
     */
    getSwapQueueStatus() {
        return {
            queueSize: this.swapQueue.length,
            isProcessing: this.isProcessing,
            pendingSwaps: this.swapQueue.map(s => ({
                exchangeId: s.exchangeId,
                fromCurrency: s.fromCurrency,
                toCurrency: s.toCurrency,
                amount: s.amount
            }))
        };
    }
    /**
     * Manual swap trigger (for admin)
     */
    triggerManualSwap(exchangeId) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.info(`🔧 Manual swap triggered for ${exchangeId}`);
            yield this.addToQueue(exchangeId);
        });
    }
}
exports.automatedSwapService = new AutomatedSwapService();
exports.default = exports.automatedSwapService;
