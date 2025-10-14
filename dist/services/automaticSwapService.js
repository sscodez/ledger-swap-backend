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
const web3_1 = __importDefault(require("web3"));
class AutomaticSwapService {
    constructor() {
        this.web3 = null;
        this.pendingExchanges = new Map();
        this.monitoringInterval = null;
        this.MASTER_DEPOSIT_ADDRESS = '0xda791a424b294a594D81b09A86531CB1Dcf6b932';
        this.lastCheckedBlock = 0;
        this.initializeService();
    }
    initializeService() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔧 Initializing Automatic Swap Service...');
                console.log('📍 Master deposit address:', this.MASTER_DEPOSIT_ADDRESS);
                // Initialize Web3 for blockchain monitoring
                const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your-project-id';
                this.web3 = new web3_1.default(rpcUrl);
                // Get current block number
                this.lastCheckedBlock = Number(yield this.web3.eth.getBlockNumber());
                console.log('📊 Starting from block:', this.lastCheckedBlock);
                console.log('✅ Automatic Swap Service initialized');
            }
            catch (error) {
                console.error('❌ Failed to initialize Automatic Swap Service:', error.message);
            }
        });
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
                const pendingExchange = {
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
                this.pendingExchanges.set(exchangeId, pendingExchange);
                console.log(`🔍 Added exchange ${exchangeId} to automatic swap monitoring`);
                console.log(`💰 Expected: ${pendingExchange.expectedAmount} ${pendingExchange.fromCurrency}`);
                console.log(`📍 Deposit address: ${pendingExchange.depositAddress}`);
                console.log(`💸 Fee: ${pendingExchange.feePercentage}%`);
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
     * Start monitoring for deposits to master address
     */
    startMonitoring() {
        if (this.monitoringInterval)
            return;
        console.log('🚀 Starting automatic swap monitoring service...');
        // Check for new transactions every 30 seconds
        this.monitoringInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield this.checkForNewDeposits();
        }), 30000);
        // Also check immediately
        this.checkForNewDeposits();
    }
    /**
     * Check for new deposits to the master address
     */
    checkForNewDeposits() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.web3 || this.pendingExchanges.size === 0)
                return;
            try {
                console.log(`🔍 Checking for new deposits... (${this.pendingExchanges.size} pending exchanges)`);
                // Get latest block number
                const latestBlock = yield this.web3.eth.getBlockNumber();
                if (latestBlock <= BigInt(this.lastCheckedBlock)) {
                    return; // No new blocks
                }
                console.log(`📊 Checking blocks ${this.lastCheckedBlock + 1} to ${Number(latestBlock)}`);
                // Check each block for transactions to our address
                for (let blockNumber = this.lastCheckedBlock + 1; blockNumber <= Number(latestBlock); blockNumber++) {
                    yield this.checkBlockForDeposits(blockNumber);
                }
                this.lastCheckedBlock = Number(latestBlock);
                // Clean up expired exchanges
                this.cleanupExpiredExchanges();
            }
            catch (error) {
                console.error('❌ Error checking for deposits:', error.message);
            }
        });
    }
    /**
     * Check a specific block for deposits to master address
     */
    checkBlockForDeposits(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.web3)
                return;
            try {
                const block = yield this.web3.eth.getBlock(blockNumber, true);
                if (!block || !block.transactions)
                    return;
                // Check each transaction in the block
                for (const tx of block.transactions) {
                    if (typeof tx === 'string')
                        continue; // Skip if tx is just hash
                    // Check ETH deposits to our master address
                    if (tx.to && tx.to.toLowerCase() === this.MASTER_DEPOSIT_ADDRESS.toLowerCase() && tx.value && tx.value !== '0x0' && tx.value !== '0') {
                        yield this.processDepositTransaction(tx, blockNumber, 'ETH');
                    }
                    // Check ERC20 token transfers to our master address
                    if (tx.to && tx.input && tx.input.length > 10) {
                        yield this.checkERC20Transfer(tx, blockNumber);
                    }
                }
            }
            catch (error) {
                console.error(`❌ Error checking block ${blockNumber}:`, error.message);
            }
        });
    }
    /**
     * Check for ERC20 token transfers (XRP, XLM, XDC, USDT)
     */
    checkERC20Transfer(tx, blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.web3)
                return;
            try {
                // ERC20 transfer function signature: transfer(address,uint256)
                const transferSignature = '0xa9059cbb';
                if (tx.input.startsWith(transferSignature)) {
                    // Decode transfer parameters
                    const recipientAddress = '0x' + tx.input.slice(34, 74);
                    const amount = this.web3.utils.hexToNumberString('0x' + tx.input.slice(74));
                    // Check if transfer is to our master address
                    if (recipientAddress.toLowerCase() === this.MASTER_DEPOSIT_ADDRESS.toLowerCase()) {
                        // Determine token type based on contract address
                        const tokenSymbol = this.getTokenSymbolByAddress(tx.to);
                        if (tokenSymbol) {
                            yield this.processDepositTransaction(tx, blockNumber, tokenSymbol, amount);
                        }
                    }
                }
            }
            catch (error) {
                console.error(`❌ Error checking ERC20 transfer:`, error.message);
            }
        });
    }
    /**
     * Get token symbol by contract address
     */
    getTokenSymbolByAddress(contractAddress) {
        const tokenMap = {
            '0x1d2F0da169ceB9fC7B3144628dB156f3F6c60dBE': 'XRP',
            '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942': 'XLM',
            '0x41AB1b6fcbB2fA9DCEd81aCbdeC13Ea6315F2Bf2': 'XDC',
            '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT'
        };
        return tokenMap[contractAddress.toLowerCase()] || null;
    }
    /**
     * Process a detected deposit transaction
     */
    processDepositTransaction(tx, blockNumber, tokenSymbol, rawAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                console.log(`💰 ${tokenSymbol} deposit detected in block ${blockNumber}:`);
                console.log(`   From: ${tx.from}`);
                console.log(`   Hash: ${tx.hash}`);
                let depositAmount;
                if (tokenSymbol === 'ETH') {
                    depositAmount = parseFloat(((_a = this.web3) === null || _a === void 0 ? void 0 : _a.utils.fromWei(tx.value || '0', 'ether')) || '0');
                    console.log(`   Amount: ${depositAmount} ETH`);
                }
                else {
                    // For ERC20 tokens, convert from raw amount (considering 18 decimals for most tokens)
                    depositAmount = parseFloat(((_b = this.web3) === null || _b === void 0 ? void 0 : _b.utils.fromWei(rawAmount || '0', 'ether')) || '0');
                    console.log(`   Amount: ${depositAmount} ${tokenSymbol}`);
                }
                // Find matching exchange based on amount and currency
                const matchingExchange = this.findMatchingExchange(depositAmount, tokenSymbol);
                if (matchingExchange) {
                    console.log(`✅ Matched deposit to exchange: ${matchingExchange.exchangeId}`);
                    yield this.executeAutomaticSwap(matchingExchange, depositAmount, tx.hash, tokenSymbol);
                }
                else {
                    console.log(`⚠️ No matching exchange found for deposit of ${depositAmount} ${tokenSymbol}`);
                    // Log unmatched deposit for manual review
                    console.log(`📝 Unmatched deposit: ${tx.hash} - ${depositAmount} ${tokenSymbol} from ${tx.from}`);
                }
            }
            catch (error) {
                console.error('❌ Error processing deposit transaction:', error.message);
            }
        });
    }
    /**
     * Find matching exchange for a deposit
     */
    findMatchingExchange(amount, currency) {
        for (const [exchangeId, exchange] of this.pendingExchanges) {
            // Match by currency and amount (with 5% tolerance)
            if (exchange.fromCurrency.toUpperCase() === currency.toUpperCase()) {
                const tolerance = exchange.expectedAmount * 0.05; // 5% tolerance
                if (Math.abs(amount - exchange.expectedAmount) <= tolerance) {
                    return exchange;
                }
            }
        }
        return null;
    }
    /**
     * Execute automatic swap after deposit is detected
     */
    executeAutomaticSwap(exchange, depositAmount, txHash, tokenSymbol) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🔄 Executing automatic swap for exchange ${exchange.exchangeId}:`);
                console.log(`   Deposit: ${depositAmount} ${exchange.fromCurrency}`);
                console.log(`   Target: ${exchange.toCurrency}`);
                console.log(`   Recipient: ${exchange.recipientAddress}`);
                // Calculate fees
                const feeAmount = depositAmount * (exchange.feePercentage / 100);
                const netAmount = depositAmount - feeAmount;
                console.log(`💸 Fee deducted: ${feeAmount} ${exchange.fromCurrency} (${exchange.feePercentage}%)`);
                console.log(`💵 Net amount for swap: ${netAmount} ${exchange.fromCurrency}`);
                // Update exchange status to processing
                yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: exchange.exchangeId }, {
                    status: 'processing',
                    depositReceived: true,
                    depositAmount: depositAmount,
                    depositTxHash: txHash,
                    feeDeducted: feeAmount,
                    netAmount: netAmount,
                    processedAt: new Date()
                });
                // Check if Rubic service is ready
                if (!rubicSwapService_1.default.isReady()) {
                    console.log('⚠️ Rubic service not ready, marking for manual processing');
                    yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: exchange.exchangeId }, {
                        status: 'in_review',
                        notes: 'Deposit received, Rubic service not available - manual swap required'
                    });
                    this.pendingExchanges.delete(exchange.exchangeId);
                    return;
                }
                // Get private key for swap execution
                const privateKey = process.env.MASTER_WALLET_PRIVATE_KEY;
                if (!privateKey) {
                    console.log('⚠️ No private key configured, marking for manual processing');
                    yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: exchange.exchangeId }, {
                        status: 'in_review',
                        notes: 'Deposit received, no private key configured - manual swap required'
                    });
                    this.pendingExchanges.delete(exchange.exchangeId);
                    return;
                }
                // Execute swap through Rubic
                console.log(`🚀 Executing Rubic swap...`);
                const swapResult = yield rubicSwapService_1.default.executeSwap({
                    fromToken: exchange.fromCurrency,
                    toToken: exchange.toCurrency,
                    amount: netAmount,
                    fromAddress: this.MASTER_DEPOSIT_ADDRESS,
                    toAddress: exchange.recipientAddress,
                    privateKey: privateKey
                });
                if (swapResult.success) {
                    // Update exchange as completed
                    yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: exchange.exchangeId }, {
                        status: 'completed',
                        swapTxHash: swapResult.txHash,
                        completedAt: new Date(),
                        gasUsed: swapResult.gasUsed,
                        amountOut: swapResult.amountOut,
                        notes: 'Automatic swap completed via Rubic'
                    });
                    console.log(`✅ Automatic swap completed for exchange ${exchange.exchangeId}`);
                    console.log(`   Deposit TX: ${txHash}`);
                    console.log(`   Swap TX: ${swapResult.txHash}`);
                    console.log(`   Amount sent: ${swapResult.amountOut} ${exchange.toCurrency}`);
                    console.log(`   Recipient: ${exchange.recipientAddress}`);
                }
                else {
                    throw new Error(swapResult.error || 'Rubic swap failed');
                }
                // Remove from pending exchanges
                this.pendingExchanges.delete(exchange.exchangeId);
            }
            catch (error) {
                console.error(`❌ Automatic swap failed for exchange ${exchange.exchangeId}:`, error.message);
                // Mark as failed
                yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: exchange.exchangeId }, {
                    status: 'failed',
                    errorMessage: error.message,
                    failedAt: new Date(),
                    notes: 'Automatic swap failed - manual intervention required'
                });
                // Remove from pending exchanges
                this.pendingExchanges.delete(exchange.exchangeId);
            }
        });
    }
    /**
     * Clean up expired exchanges
     */
    cleanupExpiredExchanges() {
        const now = new Date();
        const expiredExchanges = [];
        for (const [exchangeId, exchange] of this.pendingExchanges) {
            if (exchange.expiresAt < now) {
                expiredExchanges.push(exchangeId);
            }
        }
        for (const exchangeId of expiredExchanges) {
            this.pendingExchanges.delete(exchangeId);
            console.log(`⏰ Removed expired exchange: ${exchangeId}`);
            // Update exchange status to expired
            ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, {
                status: 'expired',
                notes: 'Exchange expired - no deposit received within time limit'
            }).catch(err => console.error('Error updating expired exchange:', err));
        }
    }
    /**
     * Stop monitoring service
     */
    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('🛑 Automatic swap monitoring stopped');
        }
    }
    /**
     * Get service status
     */
    getStatus() {
        return {
            isRunning: !!this.monitoringInterval,
            pendingExchanges: this.pendingExchanges.size,
            lastCheckedBlock: this.lastCheckedBlock,
            depositAddress: this.MASTER_DEPOSIT_ADDRESS,
            rubicReady: rubicSwapService_1.default.isReady()
        };
    }
    /**
     * Get pending exchanges list
     */
    getPendingExchanges() {
        return Array.from(this.pendingExchanges.entries()).map(([id, exchange]) => ({
            exchangeId: id,
            fromCurrency: exchange.fromCurrency,
            toCurrency: exchange.toCurrency,
            expectedAmount: exchange.expectedAmount,
            recipientAddress: exchange.recipientAddress,
            createdAt: exchange.createdAt,
            expiresAt: exchange.expiresAt
        }));
    }
}
exports.default = new AutomaticSwapService();
