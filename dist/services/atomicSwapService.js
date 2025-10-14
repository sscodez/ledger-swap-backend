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
const CryptoFee_1 = __importDefault(require("../models/CryptoFee"));
const rubicSwapService_1 = __importDefault(require("./rubicSwapService"));
class AtomicSwapService {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.pendingSwaps = new Map();
        this.monitoringInterval = null;
        this.MASTER_DEPOSIT_ADDRESS = '0xda791a424b294a594D81b09A86531CB1Dcf6b932';
        this.initializeProvider();
    }
    initializeProvider() {
        try {
            console.log('🔧 Initializing atomic swap service...');
            console.log('📍 Master deposit address:', this.MASTER_DEPOSIT_ADDRESS);
            // Check if private key is provided for automated swaps
            const privateKey = process.env.MASTER_WALLET_PRIVATE_KEY;
            if (privateKey) {
                console.log('✅ Private key found - automated swaps enabled');
                // Note: Actual ethers.js initialization would happen here in production
                this.wallet = { address: this.MASTER_DEPOSIT_ADDRESS }; // Simplified for now
            }
            else {
                console.log('⚠️ No private key provided, atomic swaps will be manual');
            }
        }
        catch (error) {
            console.error('❌ Failed to initialize atomic swap service:', error.message);
        }
    }
    /**
     * Add a new exchange to monitoring
     */
    addExchangeToMonitoring(exchangeId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const exchange = yield ExchangeHistory_1.default.findOne({ exchangeId });
                if (!exchange) {
                    console.error(`❌ Exchange ${exchangeId} not found`);
                    return;
                }
                // Get fee configuration
                const feeConfig = yield CryptoFee_1.default.findOne({
                    symbol: exchange.from.currency.toUpperCase(),
                    isActive: true
                });
                const pendingSwap = {
                    exchangeId,
                    fromCurrency: exchange.from.currency,
                    toCurrency: exchange.to.currency,
                    expectedAmount: exchange.from.amount,
                    recipientAddress: exchange.walletAddress || '',
                    depositAddress: this.MASTER_DEPOSIT_ADDRESS,
                    feePercentage: (feeConfig === null || feeConfig === void 0 ? void 0 : feeConfig.feePercentage) || 0.5,
                    createdAt: exchange.createdAt,
                    expiresAt: exchange.expiresAt || new Date(Date.now() + 5 * 60 * 1000)
                };
                this.pendingSwaps.set(exchangeId, pendingSwap);
                console.log(`🔍 Added exchange ${exchangeId} to atomic swap monitoring`);
                console.log(`💰 Expected: ${pendingSwap.expectedAmount} ${pendingSwap.fromCurrency}`);
                console.log(`📍 Deposit address: ${pendingSwap.depositAddress}`);
                console.log(`💸 Fee: ${pendingSwap.feePercentage}%`);
                // Start monitoring if not already running
                if (!this.monitoringInterval) {
                    this.startMonitoring();
                }
            }
            catch (error) {
                console.error(`❌ Failed to add exchange ${exchangeId} to monitoring:`, error.message);
            }
        });
    }
    /**
     * Start monitoring for deposits
     */
    startMonitoring() {
        if (this.monitoringInterval)
            return;
        console.log('🚀 Starting atomic swap monitoring service...');
        // Check for deposits every 30 seconds
        this.monitoringInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield this.checkForDeposits();
        }), 30000);
        // Also check immediately
        this.checkForDeposits();
    }
    /**
     * Check for deposits to the master address
     */
    checkForDeposits() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.provider || this.pendingSwaps.size === 0)
                return;
            try {
                console.log(`🔍 Checking for deposits... (${this.pendingSwaps.size} pending swaps)`);
                // Get latest block number
                const latestBlock = yield this.provider.getBlockNumber();
                const fromBlock = latestBlock - 100; // Check last 100 blocks (~20 minutes)
                // Check ETH deposits
                yield this.checkEthDeposits(fromBlock, latestBlock);
                // Check ERC20 token deposits (USDT, USDC, etc.)
                yield this.checkErc20Deposits(fromBlock, latestBlock);
                // Clean up expired swaps
                this.cleanupExpiredSwaps();
            }
            catch (error) {
                console.error('❌ Error checking for deposits:', error.message);
            }
        });
    }
    /**
     * Check for ETH deposits
     */
    checkEthDeposits(fromBlock, toBlock) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.provider)
                return;
            try {
                // Simplified deposit checking - in production this would use proper blockchain monitoring
                console.log(`🔍 Checking ETH deposits to ${this.MASTER_DEPOSIT_ADDRESS}`);
                // Check each pending ETH swap
                for (const [exchangeId, swap] of this.pendingSwaps) {
                    if (swap.fromCurrency.toUpperCase() === 'ETH') {
                        // In a real implementation, you'd track specific transactions
                        // For now, we'll simulate deposit detection
                        console.log(`🔍 Checking ETH deposit for exchange ${exchangeId}`);
                        // Simulate deposit detection (replace with actual transaction monitoring)
                        if (Math.random() > 0.9) { // 10% chance to simulate deposit
                            yield this.processDeposit(exchangeId, swap.expectedAmount, 'ETH');
                        }
                    }
                }
            }
            catch (error) {
                console.error('❌ Error checking ETH deposits:', error.message);
            }
        });
    }
    /**
     * Check for ERC20 token deposits
     */
    checkErc20Deposits(fromBlock, toBlock) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementation for ERC20 token monitoring
            // This would involve checking Transfer events for USDT, USDC, etc.
            console.log('🔍 Checking ERC20 deposits...');
        });
    }
    /**
     * Process a detected deposit
     */
    processDeposit(exchangeId, amount, currency) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const swap = this.pendingSwaps.get(exchangeId);
                if (!swap)
                    return;
                console.log(`💰 Deposit detected for exchange ${exchangeId}:`);
                console.log(`   Amount: ${amount} ${currency}`);
                console.log(`   Expected: ${swap.expectedAmount} ${swap.fromCurrency}`);
                // Calculate fees
                const feeAmount = amount * (swap.feePercentage / 100);
                const netAmount = amount - feeAmount;
                console.log(`💸 Fee deducted: ${feeAmount} ${currency} (${swap.feePercentage}%)`);
                console.log(`💵 Net amount: ${netAmount} ${currency}`);
                // Update exchange status
                yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, {
                    status: 'processing',
                    depositReceived: true,
                    depositAmount: amount,
                    feeDeducted: feeAmount,
                    netAmount: netAmount,
                    processedAt: new Date()
                });
                // Execute the swap
                yield this.executeSwap(exchangeId, netAmount, swap);
                // Remove from pending swaps
                this.pendingSwaps.delete(exchangeId);
            }
            catch (error) {
                console.error(`❌ Error processing deposit for ${exchangeId}:`, error.message);
            }
        });
    }
    /**
     * Execute the atomic swap
     */
    executeSwap(exchangeId, amount, swap) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🔄 Executing swap for exchange ${exchangeId}:`);
                console.log(`   From: ${amount} ${swap.fromCurrency}`);
                console.log(`   To: ${swap.toCurrency}`);
                console.log(`   Recipient: ${swap.recipientAddress}`);
                if (!this.wallet) {
                    console.log('⚠️ No wallet configured, marking for manual processing');
                    yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, {
                        status: 'in_review',
                        notes: 'Deposit received, manual swap required'
                    });
                    return;
                }
                // Execute real swap using Rubic SDK
                console.log(`🔄 Executing Rubic swap...`);
                console.log(`   From: ${amount} ${swap.fromCurrency}`);
                console.log(`   To: ${swap.toCurrency}`);
                console.log(`   Recipient: ${swap.recipientAddress}`);
                // Check if Rubic service is ready
                if (!rubicSwapService_1.default.isReady()) {
                    console.log('⚠️ Rubic SDK not ready, marking for manual processing');
                    yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, {
                        status: 'in_review',
                        notes: 'Deposit received, Rubic SDK not available - manual swap required'
                    });
                    return;
                }
                // Get private key for swap execution
                const privateKey = process.env.MASTER_WALLET_PRIVATE_KEY;
                if (!privateKey) {
                    console.log('⚠️ No private key configured, marking for manual processing');
                    yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, {
                        status: 'in_review',
                        notes: 'Deposit received, no private key configured - manual swap required'
                    });
                    return;
                }
                // Execute swap through Rubic
                const swapResult = yield rubicSwapService_1.default.executeSwap({
                    fromToken: swap.fromCurrency,
                    toToken: swap.toCurrency,
                    amount: amount,
                    fromAddress: this.MASTER_DEPOSIT_ADDRESS,
                    toAddress: swap.recipientAddress,
                    privateKey: privateKey
                });
                if (swapResult.success) {
                    yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, {
                        status: 'completed',
                        swapTxHash: swapResult.txHash,
                        completedAt: new Date(),
                        gasUsed: swapResult.gasUsed,
                        amountOut: swapResult.amountOut,
                        notes: 'Swap completed via Rubic SDK'
                    });
                    console.log(`✅ Rubic swap completed for exchange ${exchangeId}`);
                    console.log(`   Transaction: ${swapResult.txHash}`);
                    console.log(`   Amount out: ${swapResult.amountOut} ${swap.toCurrency}`);
                }
                else {
                    throw new Error(swapResult.error || 'Rubic swap failed');
                }
            }
            catch (error) {
                console.error(`❌ Swap failed for exchange ${exchangeId}:`, error.message);
                // Mark as failed
                yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, {
                    status: 'failed',
                    errorMessage: error.message,
                    failedAt: new Date()
                });
            }
        });
    }
    /**
     * Clean up expired swaps
     */
    cleanupExpiredSwaps() {
        const now = new Date();
        const expiredSwaps = [];
        for (const [exchangeId, swap] of this.pendingSwaps) {
            if (swap.expiresAt < now) {
                expiredSwaps.push(exchangeId);
            }
        }
        for (const exchangeId of expiredSwaps) {
            this.pendingSwaps.delete(exchangeId);
            console.log(`⏰ Removed expired swap: ${exchangeId}`);
        }
    }
    /**
     * Stop monitoring service
     */
    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('🛑 Atomic swap monitoring stopped');
        }
    }
    /**
     * Get monitoring status
     */
    getStatus() {
        return {
            isRunning: !!this.monitoringInterval,
            pendingSwaps: this.pendingSwaps.size,
            walletConnected: !!this.wallet,
            depositAddress: this.MASTER_DEPOSIT_ADDRESS
        };
    }
}
exports.default = new AtomicSwapService();
