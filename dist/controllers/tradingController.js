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
exports.testRubicSDK = exports.getTradingHealth = exports.getSupportedTradingPairs = exports.getSupportedTokens = exports.simulateSwap = exports.getSwapStatus = exports.executeSwap = exports.getTradingQuote = void 0;
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
const CryptoFee_1 = __importDefault(require("../models/CryptoFee"));
const rubicTradingEngine_1 = __importDefault(require("../services/rubicTradingEngine"));
// Initialize Rubic SDK only - no mock engines
const rubicEngine = new rubicTradingEngine_1.default();
let rubicInitialized = false;
// Initialize Rubic SDK asynchronously
rubicEngine.initialize()
    .then(() => {
    rubicInitialized = true;
    console.log('✅ Rubic Trading Engine initialized - Real DEX trading only');
})
    .catch((error) => {
    console.error('❌ Failed to initialize Rubic Trading Engine:', error.message);
    console.error('❌ Real trading unavailable - check configuration');
});
// Helper function to calculate price impact
function calculatePriceImpact(inputAmount, fromAmount, toAmount) {
    const input = parseFloat(inputAmount);
    const from = parseFloat(fromAmount);
    const to = parseFloat(toAmount);
    if (input === 0 || from === 0 || to === 0)
        return 0;
    const expectedRate = to / from;
    const actualRate = to / input;
    const impact = Math.abs((expectedRate - actualRate) / expectedRate) * 100;
    return Math.min(impact, 100); // Cap at 100%
}
// GET /api/trading/quote - Get trading quote for a swap (Rubic only)
const getTradingQuote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fromToken, toToken, amount } = req.query;
        if (!fromToken || !toToken || !amount) {
            return res.status(400).json({
                message: 'fromToken, toToken, and amount are required'
            });
        }
        // Check if Rubic is initialized, if not try to initialize it
        if (!rubicInitialized) {
            console.log('⚠️ Rubic not initialized, attempting to initialize...');
            try {
                yield rubicEngine.initialize();
                rubicInitialized = true;
                console.log('✅ Rubic SDK initialized successfully on demand');
            }
            catch (initError) {
                console.error('❌ Failed to initialize Rubic SDK on demand:', initError.message);
                // Continue anyway - the getBestQuote will use fallback
            }
        }
        // Get real quote from Rubic SDK
        const quote = yield rubicEngine.getBestQuote(fromToken, toToken, amount);
        console.log(`✅ Got Rubic quote: ${quote.toAmount} ${toToken} for ${amount} ${fromToken}`);
        // Calculate admin fees
        const feeInfo = yield CryptoFee_1.default.findOne({
            symbol: fromToken.toUpperCase(),
            isActive: true
        });
        let feeAmount = 0;
        let netAmount = parseFloat(amount);
        if (feeInfo) {
            feeAmount = (parseFloat(amount) * feeInfo.feePercentage) / 100;
            // Ensure fee is within min/max bounds
            feeAmount = Math.max(feeInfo.minimumFee, Math.min(feeAmount, feeInfo.maximumFee));
            netAmount = parseFloat(amount) - feeAmount;
        }
        // Recalculate quote with net amount (after fee deduction)
        const finalQuote = yield rubicEngine.getBestQuote(fromToken, toToken, netAmount.toString());
        return res.json({
            quote: finalQuote,
            fee: {
                amount: feeAmount,
                percentage: (feeInfo === null || feeInfo === void 0 ? void 0 : feeInfo.feePercentage) || 0,
                currency: fromToken
            },
            netInput: netAmount,
            estimatedOutput: finalQuote.toAmount,
            priceImpact: finalQuote.priceImpact || calculatePriceImpact(amount, finalQuote.fromAmount, finalQuote.toAmount),
            route: finalQuote.route,
            provider: 'rubic',
            tradeType: finalQuote.tradeType || 'RUBIC_DEX'
        });
    }
    catch (error) {
        console.error('❌ Error getting Rubic trading quote:', error);
        return res.status(500).json({
            message: 'Failed to get trading quote from Rubic SDK',
            error: error.message
        });
    }
});
exports.getTradingQuote = getTradingQuote;
// POST /api/trading/execute - Execute a swap
const executeSwap = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { exchangeId } = req.body;
        if (!exchangeId) {
            return res.status(400).json({
                message: 'exchangeId is required'
            });
        }
        // Find the exchange record
        const exchange = yield ExchangeHistory_1.default.findOne({ exchangeId });
        if (!exchange) {
            return res.status(404).json({
                message: 'Exchange not found'
            });
        }
        if (exchange.status !== 'pending') {
            return res.status(400).json({
                message: `Exchange is not in pending status. Current status: ${exchange.status}`
            });
        }
        // Calculate net amount after fees
        const feeInfo = yield CryptoFee_1.default.findOne({
            symbol: exchange.from.currency.toUpperCase(),
            isActive: true
        });
        let netAmount = exchange.from.amount;
        if (feeInfo) {
            const feeAmount = Math.max(feeInfo.minimumFee, Math.min((exchange.from.amount * feeInfo.feePercentage) / 100, feeInfo.maximumFee));
            netAmount = exchange.from.amount - feeAmount;
        }
        // Use Rubic SDK only for execution
        if (!rubicInitialized) {
            return res.status(503).json({
                message: 'Trading engine not available',
                error: 'Rubic SDK is not initialized. Cannot execute swap.'
            });
        }
        // Get fresh quote for execution from Rubic only
        const quote = yield rubicEngine.getBestQuote(exchange.from.currency, exchange.to.currency, netAmount.toString());
        console.log(`✅ Using Rubic for execution: ${quote.tradeType}`);
        // Execute the swap using Rubic SDK
        const execution = yield rubicEngine.executeSwap(exchangeId, quote);
        // Start monitoring the transaction
        yield rubicEngine.monitorTransaction(execution.txHash, exchangeId);
        return res.json({
            message: 'Swap execution initiated',
            transactionHash: execution.txHash,
            status: execution.status,
            exchangeId,
            estimatedCompletion: '5-10 minutes'
        });
    }
    catch (error) {
        console.error('Error executing swap:', error);
        // Update exchange status to failed
        if (req.body.exchangeId) {
            yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId: req.body.exchangeId }, { status: 'failed' });
        }
        return res.status(500).json({
            message: 'Failed to execute swap',
            error: error.message
        });
    }
});
exports.executeSwap = executeSwap;
// GET /api/trading/status/:exchangeId - Get swap status
const getSwapStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { exchangeId } = req.params;
        const exchange = yield ExchangeHistory_1.default.findOne({ exchangeId });
        if (!exchange) {
            return res.status(404).json({
                message: 'Exchange not found'
            });
        }
        return res.json({
            exchangeId,
            status: exchange.status,
            from: exchange.from,
            to: exchange.to,
            fees: exchange.fees,
            transactionHash: exchange.withdrawalTxId || exchange.kucoinOrderId,
            createdAt: exchange.createdAt,
            completedAt: exchange.updatedAt,
            isAnonymous: exchange.isAnonymous
        });
    }
    catch (error) {
        console.error('Error getting swap status:', error);
        return res.status(500).json({
            message: 'Failed to get swap status',
            error: error.message
        });
    }
});
exports.getSwapStatus = getSwapStatus;
// POST /api/trading/simulate - Simulate a swap without executing
const simulateSwap = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fromToken, toToken, amount } = req.body;
        if (!fromToken || !toToken || !amount) {
            return res.status(400).json({
                message: 'fromToken, toToken, and amount are required'
            });
        }
        // Use Rubic SDK only for simulation
        if (!rubicInitialized) {
            return res.status(503).json({
                message: 'Trading engine not available',
                error: 'Rubic SDK is not initialized. Cannot simulate swap.'
            });
        }
        // Get real quote from Rubic SDK for simulation
        const quote = yield rubicEngine.getBestQuote(fromToken, toToken, amount);
        console.log(`✅ Using Rubic for simulation: ${quote.tradeType}`);
        // Calculate fees
        const feeInfo = yield CryptoFee_1.default.findOne({
            symbol: fromToken.toUpperCase(),
            isActive: true
        });
        let feeAmount = 0;
        if (feeInfo) {
            feeAmount = Math.max(feeInfo.minimumFee, Math.min((parseFloat(amount) * feeInfo.feePercentage) / 100, feeInfo.maximumFee));
        }
        return res.json({
            simulation: {
                input: {
                    token: fromToken,
                    amount: parseFloat(amount),
                    usdValue: 0 // Would need price feed integration
                },
                output: {
                    token: toToken,
                    amount: parseFloat(quote.toAmount),
                    usdValue: 0 // Would need price feed integration
                },
                fee: {
                    amount: feeAmount,
                    percentage: (feeInfo === null || feeInfo === void 0 ? void 0 : feeInfo.feePercentage) || 0,
                    currency: fromToken
                },
                route: quote.route,
                provider: 'rubic',
                estimatedGas: quote.estimatedGas,
                priceImpact: calculatePriceImpact(amount, quote.fromAmount, quote.toAmount)
            }
        });
    }
    catch (error) {
        console.error('❌ Error simulating swap:', error);
        return res.status(500).json({
            message: 'Failed to simulate swap with Rubic SDK',
            error: error.message
        });
    }
});
exports.simulateSwap = simulateSwap;
// GET /api/trading/supported-tokens - Get list of supported tokens (Rubic only)
const getSupportedTokens = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!rubicInitialized) {
            return res.status(503).json({
                message: 'Trading engine not available',
                error: 'Rubic SDK is not initialized. Cannot get supported tokens.'
            });
        }
        // Get tokens from Rubic SDK only
        const supportedTokens = rubicEngine.getSupportedTokens();
        return res.json({
            tokens: supportedTokens,
            count: supportedTokens.length,
            provider: 'rubic',
            rubicStatus: 'initialized'
        });
    }
    catch (error) {
        console.error('Error getting supported tokens:', error);
        return res.status(500).json({
            message: 'Failed to get supported tokens',
            error: error.message,
            provider: 'rubic',
            rubicStatus: rubicInitialized ? 'initialized' : 'not-initialized'
        });
    }
});
exports.getSupportedTokens = getSupportedTokens;
// GET /api/trading/supported-pairs - Get list of supported trading pairs (Rubic only)
const getSupportedTradingPairs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!rubicInitialized) {
            return res.status(503).json({
                message: 'Trading engine not available',
                error: 'Rubic SDK is not initialized. Cannot get supported trading pairs.'
            });
        }
        // Get trading pairs from Rubic SDK only
        const supportedPairs = rubicEngine.getSupportedTradingPairs();
        return res.json({
            pairs: supportedPairs,
            count: supportedPairs.length,
            note: 'All pairs are bidirectional (can be swapped in both directions)',
            provider: 'rubic',
            rubicStatus: 'initialized'
        });
    }
    catch (error) {
        console.error('Error getting supported trading pairs:', error);
        return res.status(500).json({
            message: 'Failed to get supported trading pairs',
            error: error.message,
            provider: 'rubic',
            rubicStatus: rubicInitialized ? 'initialized' : 'not-initialized'
        });
    }
});
exports.getSupportedTradingPairs = getSupportedTradingPairs;
// GET /api/trading/health - Check trading engine health (Rubic only)
const getTradingHealth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return res.json({
            status: rubicInitialized ? 'healthy' : 'unavailable',
            engines: {
                rubic: {
                    status: rubicInitialized ? 'active' : 'inactive',
                    description: rubicInitialized ? 'Rubic SDK initialized and ready' : 'Rubic SDK not initialized'
                }
            },
            activeEngine: rubicInitialized ? 'rubic' : 'none',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error checking trading health:', error);
        return res.status(500).json({
            message: 'Failed to check trading health',
            error: error.message
        });
    }
});
exports.getTradingHealth = getTradingHealth;
// GET /api/trading/test - Test Rubic SDK functionality
const testRubicSDK = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!rubicInitialized) {
            return res.status(503).json({
                message: 'Rubic SDK not initialized',
                error: 'Cannot test - SDK not ready'
            });
        }
        // Test with a simple XRP to BTC quote (both on BSC)
        console.log('Testing Rubic SDK with XRP → BTC quote...');
        const testQuote = yield rubicEngine.getBestQuote('XRP', 'BTC', '100');
        return res.json({
            message: 'Rubic SDK test successful',
            testQuote,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Rubic SDK test failed:', error);
        return res.status(500).json({
            message: 'Rubic SDK test failed',
            error: error.message,
            details: error.toString()
        });
    }
});
exports.testRubicSDK = testRubicSDK;
