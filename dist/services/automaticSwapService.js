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
const rubicTradingEngine_1 = require("./rubicTradingEngine");
const cryptoTransferService_1 = __importDefault(require("./cryptoTransferService"));
const web3_1 = __importDefault(require("web3"));
class AutomaticSwapService {
    constructor() {
        this.web3 = null;
        this.pendingExchanges = new Map();
        this.monitoringInterval = null;
        this.MASTER_DEPOSIT_ADDRESS = '0xda791a424b294a594D81b09A86531CB1Dcf6b932';
        this.lastCheckedBlock = 0;
        this.rubicEngine = new rubicTradingEngine_1.RubicTradingEngine();
        this.initializeService();
    }
    initializeService() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔧 Initializing Enhanced Automatic Swap Service with Rubic SDK...');
                console.log('📍 Master deposit address:', this.MASTER_DEPOSIT_ADDRESS);
                // Initialize Web3 for blockchain monitoring
                const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your-project-id';
                this.web3 = new web3_1.default(rpcUrl);
                // Initialize Rubic SDK (if needed)
                // rubicTradingEngine.initialize(); // Initialize if this method exists
                // Get current block number
                this.lastCheckedBlock = Number(yield this.web3.eth.getBlockNumber());
                console.log('📊 Starting from block:', this.lastCheckedBlock);
                console.log('✅ Enhanced Automatic Swap Service initialized with Rubic SDK');
            }
            catch (error) {
                console.error('❌ Failed to initialize Enhanced Automatic Swap Service:', error.message);
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
                // Get fee configuration with enhanced admin panel integration
                const feeConfig = yield CryptoFee_1.default.findOne({
                    symbol: exchange.from.currency.toUpperCase(),
                    isActive: true
                });
                // Enhanced fee calculation with min/max bounds and fee collection address
                let feePercentage = 0.5; // Default fallback
                let feeCollectionAddress = '0x0000000000000000000000000000000000000000'; // Default fallback
                if (feeConfig) {
                    feePercentage = feeConfig.feePercentage;
                    feeCollectionAddress = feeConfig.feeCollectionAddress || '0x0000000000000000000000000000000000000000';
                    // Apply minimum and maximum fee constraints (using expected amount for calculation)
                    const expectedAmount = exchange.from.amount;
                    const calculatedFee = expectedAmount * (feePercentage / 100);
                    if (feeConfig.minimumFee && calculatedFee < feeConfig.minimumFee) {
                        feePercentage = (feeConfig.minimumFee / expectedAmount) * 100;
                        console.log(`💰 Applied minimum fee constraint: ${feePercentage}% (${feeConfig.minimumFee} ${exchange.from.currency})`);
                    }
                    else if (feeConfig.maximumFee && calculatedFee > feeConfig.maximumFee) {
                        feePercentage = (feeConfig.maximumFee / expectedAmount) * 100;
                        console.log(`💰 Applied maximum fee constraint: ${feePercentage}% (${feeConfig.maximumFee} ${exchange.from.currency})`);
                    }
                }
                const pendingExchange = {
                    exchangeId,
                    fromCurrency: exchange.from.currency,
                    toCurrency: exchange.to.currency,
                    expectedAmount: exchange.from.amount,
                    recipientAddress: exchange.walletAddress || '',
                    depositAddress: this.MASTER_DEPOSIT_ADDRESS,
                    feePercentage: feePercentage,
                    createdAt: exchange.createdAt,
                    expiresAt: exchange.expiresAt || new Date(Date.now() + 5 * 60 * 1000)
                };
                this.pendingExchanges.set(exchangeId, pendingExchange);
                console.log(`🔍 Added exchange ${exchangeId} to automatic swap monitoring`);
                console.log(`💰 Expected: ${pendingExchange.expectedAmount} ${pendingExchange.fromCurrency}`);
                console.log(`💸 Fee: ${pendingExchange.feePercentage}% → ${feeCollectionAddress}`);
                console.log(`📍 Deposit address: ${pendingExchange.depositAddress}`);
                // Start monitoring if not already running
                if (!this.monitoringInterval) {
                    this.startEnhancedMonitoring();
                }
            }
            catch (error) {
                console.error(`❌ Failed to add exchange ${exchangeId} to monitoring:`, error.message);
            }
        });
    }
    /**
     * Enhanced monitoring with real-time event subscription
     */
    startEnhancedMonitoring() {
        if (this.monitoringInterval)
            return;
        console.log('🚀 Starting enhanced automatic swap monitoring service...');
        console.log('📡 Features: Block scanning, mempool monitoring, event subscription');
        // Check for new transactions every 30 seconds
        this.monitoringInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield this.checkForNewDeposits();
        }), 30000);
        // Also check immediately
        this.checkForNewDeposits();
        // Start WebSocket monitoring if available (for real-time event subscription)
        this.startWebSocketMonitoring();
    }
    /**
     * WebSocket monitoring for real-time transaction events
     */
    startWebSocketMonitoring() {
        try {
            // Check if WebSocket provider is available
            if (this.web3 && this.web3.currentProvider) {
                console.log('📡 WebSocket monitoring available - enhanced real-time detection');
                // In a real implementation, you would subscribe to:
                // - New block headers
                // - Pending transactions
                // - Specific address transfers
                // For now, just log that it's available for future implementation
                console.log('💡 WebSocket provider detected - ready for real-time event subscription');
            }
            else {
                console.log('📡 WebSocket monitoring not available - using polling mode');
            }
        }
        catch (error) {
            console.log('📡 WebSocket monitoring setup failed - using polling mode');
        }
    }
    /**
     * Enhanced deposit monitoring with better event detection
     */
    checkForNewDeposits() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.web3 || this.pendingExchanges.size === 0)
                return;
            try {
                // Enhanced monitoring with real-time event subscription
                console.log(`🔍 Enhanced monitoring: Checking for deposits... (${this.pendingExchanges.size} pending exchanges)`);
                // Get latest block number
                const latestBlock = yield this.web3.eth.getBlockNumber();
                if (latestBlock <= BigInt(this.lastCheckedBlock)) {
                    console.log('💤 No new blocks to check');
                    return; // No new blocks
                }
                console.log(`📊 Enhanced monitoring: Checking blocks ${this.lastCheckedBlock + 1} to ${Number(latestBlock)}`);
                // Check each block for transactions to our address
                for (let blockNumber = this.lastCheckedBlock + 1; blockNumber <= Number(latestBlock); blockNumber++) {
                    yield this.checkBlockForDeposits(blockNumber);
                }
                this.lastCheckedBlock = Number(latestBlock);
                // Also check for pending transactions (mempool) - enhanced monitoring
                yield this.checkPendingTransactions();
                // Clean up expired exchanges
                this.cleanupExpiredExchanges();
            }
            catch (error) {
                console.error('❌ Error in enhanced deposit monitoring:', error.message);
                // Enhanced error handling for monitoring failures
                if (error.message.includes('connection')) {
                    console.log('🔄 RPC connection issue - will retry on next check');
                }
                else if (error.message.includes('rate limit')) {
                    console.log('🚦 Rate limited - increasing check interval');
                    // Could implement exponential backoff here
                }
                else {
                    console.error('❌ Unexpected monitoring error:', error.message);
                }
            }
        });
    }
    /**
     * Check pending transactions in mempool for faster detection
     */
    checkPendingTransactions() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.web3)
                return;
            try {
                console.log('🔍 Enhanced monitoring: Checking mempool for pending transactions...');
                // Get pending transactions (this is Web3.js specific)
                // Note: This might not work with all providers, but it's worth trying for faster detection
                try {
                    const pendingBlock = yield this.web3.eth.getBlock('pending', true);
                    if (pendingBlock && pendingBlock.transactions) {
                        for (const tx of pendingBlock.transactions) {
                            if (typeof tx === 'string')
                                continue;
                            // Check if this pending transaction is to our address
                            if (tx.to && tx.to.toLowerCase() === this.MASTER_DEPOSIT_ADDRESS.toLowerCase()) {
                                console.log(`🚨 Pending transaction detected: ${tx.hash}`);
                                // Don't process pending transactions immediately, just log for now
                                // They will be processed when mined into a block
                            }
                        }
                    }
                }
                catch (pendingError) {
                    // Mempool checking not supported by this provider, skip silently
                    console.log('💭 Mempool monitoring not available with current provider');
                }
            }
            catch (error) {
                console.error('❌ Error checking pending transactions:', error.message);
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
                    if (tx.to && tx.to.toLowerCase() === this.MASTER_DEPOSIT_ADDRESS.toLowerCase() && tx.value) {
                        // Handle both string and bigint values for tx.value
                        const valueString = tx.value.toString();
                        if (valueString !== '0x0' && valueString !== '0') {
                            yield this.processDepositTransaction(tx, blockNumber, 'ETH');
                        }
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
            var _a, _b, _c;
            try {
                console.log(`💰 ${tokenSymbol} deposit detected in block ${blockNumber}:`);
                console.log(`   From: ${tx.from}`);
                console.log(`   Hash: ${tx.hash}`);
                let depositAmount;
                if (tokenSymbol === 'ETH') {
                    const valueString = ((_a = tx.value) === null || _a === void 0 ? void 0 : _a.toString()) || '0';
                    depositAmount = parseFloat(((_b = this.web3) === null || _b === void 0 ? void 0 : _b.utils.fromWei(valueString, 'ether')) || '0');
                    console.log(`   Amount: ${depositAmount} ETH`);
                }
                else {
                    // For ERC20 tokens, convert from raw amount (considering 18 decimals for most tokens)
                    depositAmount = parseFloat(((_c = this.web3) === null || _c === void 0 ? void 0 : _c.utils.fromWei(rawAmount || '0', 'ether')) || '0');
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
                // Get fee configuration to get collection address
                const feeConfig = yield CryptoFee_1.default.findOne({
                    symbol: exchange.fromCurrency.toUpperCase(),
                    isActive: true
                });
                const feeCollectionAddress = (feeConfig === null || feeConfig === void 0 ? void 0 : feeConfig.feeCollectionAddress) || '0x0000000000000000000000000000000000000000';
                // Calculate fees
                const feeAmount = depositAmount * (exchange.feePercentage / 100);
                const netAmount = depositAmount - feeAmount;
                console.log(`💸 Fee deducted: ${feeAmount} ${exchange.fromCurrency} (${exchange.feePercentage}%)`);
                console.log(`💵 Net amount for swap: ${netAmount} ${exchange.fromCurrency}`);
                console.log(`💰 Fee collection address: ${feeCollectionAddress}`);
                // Update exchange status to processing
                yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: exchange.exchangeId }, {
                    status: 'processing',
                    depositReceived: true,
                    depositAmount: depositAmount,
                    depositTxHash: txHash,
                    feeDeducted: feeAmount,
                    feeCollectionAddress: feeCollectionAddress,
                    netAmount: netAmount,
                    processedAt: new Date()
                });
                // Send fee to collection address (if not zero address)
                if (feeCollectionAddress && feeCollectionAddress !== '0x0000000000000000000000000000000000000000') {
                    try {
                        console.log(`💰 Sending fee ${feeAmount} ${exchange.fromCurrency} to ${feeCollectionAddress}`);
                        // Transfer fee to collection address using crypto transfer service
                        const transferResult = yield cryptoTransferService_1.default.transferFeeToCollection({
                            fromCurrency: exchange.fromCurrency,
                            feeAmount: feeAmount,
                            feeCollectionAddress: feeCollectionAddress
                        });
                        if (transferResult.success && transferResult.txHash) {
                            console.log(`✅ Fee transfer completed: ${transferResult.txHash}`);
                            // Update exchange with fee transfer confirmation
                            yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: exchange.exchangeId }, {
                                feeTransferTxHash: transferResult.txHash,
                                feeTransferConfirmed: true,
                            });
                        }
                        else {
                            throw new Error(transferResult.error || 'Fee transfer failed');
                        }
                    }
                    catch (feeError) {
                        console.error(`❌ Fee transfer failed:`, feeError.message);
                        // If fee transfer fails, mark exchange as failed
                        yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: exchange.exchangeId }, {
                            status: 'failed',
                            errorMessage: `Fee transfer failed: ${feeError.message}`,
                            notes: 'Failed to transfer fee to collection address'
                        });
                        this.pendingExchanges.delete(exchange.exchangeId);
                        return;
                    }
                }
                // Check if Rubic SDK is ready
                if (!this.rubicEngine) {
                    console.log('⚠️ Rubic SDK not available, marking for manual processing');
                    yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: exchange.exchangeId }, {
                        status: 'in_review',
                        notes: 'Deposit received, Rubic SDK not available - manual swap required'
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
                // Enhanced swap execution with proper cross-chain support
                console.log(`🚀 Executing Rubic SDK swap...`);
                console.log(`💱 From: ${netAmount} ${exchange.fromCurrency} → ${exchange.toCurrency}`);
                console.log(`👤 To: ${exchange.recipientAddress}`);
                // Get best quote from Rubic SDK (automatically handles cross-chain vs on-chain)
                const quote = yield this.rubicEngine.getBestQuote(exchange.fromCurrency, exchange.toCurrency, netAmount.toString());
                console.log(`📊 Rubic SDK quote: ${quote.toAmount} ${exchange.toCurrency}`);
                console.log(`🔗 Trade type: ${quote.tradeType}`);
                // Execute the swap using Rubic SDK
                const executionResult = yield this.rubicEngine.executeSwap(exchange.exchangeId, quote);
                if (executionResult.txHash) {
                    // Validate recipient address before considering swap complete
                    if (!exchange.recipientAddress || exchange.recipientAddress.trim().length < 6) {
                        console.error(`❌ Invalid recipient address for exchange ${exchange.exchangeId}: ${exchange.recipientAddress}`);
                        yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: exchange.exchangeId }, {
                            status: 'failed',
                            errorMessage: 'Invalid recipient address',
                            notes: 'Cannot complete swap - recipient address is invalid'
                        });
                        this.pendingExchanges.delete(exchange.exchangeId);
                        return;
                    }
                    // Update exchange as completed with enhanced tracking
                    yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: exchange.exchangeId }, {
                        status: 'completed',
                        swapTxHash: executionResult.txHash,
                        completedAt: new Date(),
                        gasUsed: quote.estimatedGas,
                        amountOut: quote.toAmount,
                        notes: `Automatic swap completed via Rubic SDK - Fee: ${feeAmount} ${exchange.fromCurrency} → ${quote.toAmount} ${exchange.toCurrency} to ${exchange.recipientAddress} (${quote.tradeType})`
                    });
                    console.log(`✅ Enhanced Rubic SDK swap completed for exchange ${exchange.exchangeId}`);
                    console.log(`   Deposit TX: ${txHash}`);
                    console.log(`   Swap TX: ${executionResult.txHash}`);
                    console.log(`   Fee deducted: ${feeAmount} ${exchange.fromCurrency}`);
                    console.log(`   Fee sent to: ${feeCollectionAddress}`);
                    console.log(`   Net swapped: ${netAmount} ${exchange.fromCurrency}`);
                    console.log(`   Amount sent: ${quote.toAmount} ${exchange.toCurrency}`);
                    console.log(`   Trade type: ${quote.tradeType}`);
                    console.log(`   Recipient: ${exchange.recipientAddress}`);
                    // Log success for monitoring
                    console.log(`🎉 RUBIC SDK SWAP SUCCESS: ${exchange.exchangeId} - ${quote.toAmount} ${exchange.toCurrency} sent to ${exchange.recipientAddress} via ${quote.tradeType}`);
                }
                else {
                    console.error(`❌ Rubic SDK swap execution failed - no transaction hash returned for exchange ${exchange.exchangeId}`);
                    throw new Error('Rubic SDK swap execution failed - no transaction hash returned');
                }
                // Remove from pending exchanges
                this.pendingExchanges.delete(exchange.exchangeId);
            }
            catch (error) {
                console.error(`❌ Automatic swap failed for exchange ${exchange.exchangeId}:`, error.message);
                // Enhanced error categorization and handling
                let errorStatus = 'failed';
                let errorNotes = 'Automatic swap failed - manual intervention required';
                if (error.message.includes('insufficient funds')) {
                    errorStatus = 'failed';
                    errorNotes = 'Insufficient funds in wallet for swap execution';
                }
                else if (error.message.includes('timeout')) {
                    errorStatus = 'failed';
                    errorNotes = 'Swap timeout - network congestion or low gas price';
                }
                else if (error.message.includes('reverted')) {
                    errorStatus = 'failed';
                    errorNotes = 'Swap reverted - insufficient liquidity or slippage too high';
                }
                else if (error.message.includes('SDK not available')) {
                    errorStatus = 'in_review';
                    errorNotes = 'Rubic SDK not available - manual swap required';
                }
                else if (error.message.includes('No swap route available')) {
                    errorStatus = 'in_review';
                    errorNotes = 'No swap route available - insufficient liquidity for this pair';
                }
                // Mark as failed or in_review based on error type
                yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: exchange.exchangeId }, {
                    status: errorStatus,
                    errorMessage: error.message,
                    failedAt: new Date(),
                    notes: errorNotes
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
            rubicReady: !!this.rubicEngine
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
