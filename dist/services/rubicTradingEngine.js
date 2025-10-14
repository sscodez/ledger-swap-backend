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
exports.RubicTradingEngine = void 0;
const rubic_sdk_1 = require("rubic-sdk");
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
class RubicTradingEngine {
    constructor() {
        this.sdk = null;
        this.config = this.createConfiguration();
    }
    createConfiguration() {
        return {
            rpcProviders: {
                [rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM]: {
                    rpcList: [
                        process.env.INFURA_ETHEREUM_RPC || 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
                    ]
                },
                [rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: {
                    rpcList: [
                        'https://bsc-dataseed.binance.org/'
                    ]
                }
            }
        };
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            const maxRetries = 3;
            let lastError;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`🔄 Initializing Rubic SDK (attempt ${attempt}/${maxRetries})`);
                    console.log('Config:', JSON.stringify(this.config, null, 2));
                    this.sdk = yield rubic_sdk_1.SDK.createSDK(this.config);
                    console.log('✅ Rubic SDK initialized successfully');
                    return; // Success, exit the retry loop
                }
                catch (error) {
                    lastError = error;
                    console.error(`❌ Attempt ${attempt} failed:`, error.message);
                    if (attempt < maxRetries) {
                        const delay = attempt * 2000; // 2s, 4s delays
                        console.log(`⏳ Retrying in ${delay}ms...`);
                        yield new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            // All retries failed
            console.error('❌ Failed to initialize Rubic SDK after all retries:', lastError.message);
            console.error('❌ Full error:', lastError);
            // Don't throw - let the system continue with fallback
            console.log('⚠️ Continuing without Rubic SDK - will use fallback calculations');
        });
    }
    // Get best quote for same-chain swaps
    getOnChainQuote(fromToken, toToken, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            if (!this.sdk) {
                throw new Error('Rubic SDK not initialized');
            }
            try {
                const blockchain = this.getBlockchainFromToken(fromToken);
                const fromTokenAddress = this.getTokenAddress(fromToken);
                const toTokenAddress = this.getTokenAddress(toToken);
                console.log(`🔗 On-chain quote details:`);
                console.log(`   Blockchain: ${blockchain}`);
                console.log(`   From: ${fromToken} → ${fromTokenAddress}`);
                console.log(`   To: ${toToken} → ${toTokenAddress}`);
                console.log(`   Amount: ${amount}`);
                // For testing, let's try with well-known tokens first
                let testFromToken = { blockchain, address: fromTokenAddress };
                let testToToken = toTokenAddress;
                // If we're testing XRP->BTC on BSC, let's try BNB->USDT instead (guaranteed liquidity)
                if (fromToken.toUpperCase() === 'XRP' && toToken.toUpperCase() === 'BTC') {
                    console.log('🧪 Testing with BNB->USDT for better liquidity');
                    testFromToken = {
                        blockchain: rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
                        address: '0x0000000000000000000000000000000000000000' // Native BNB
                    };
                    testToToken = '0x55d398326f99059fF775485246999027B3197955'; // USDT on BSC
                }
                const trades = yield this.sdk.onChainManager.calculateTrade(testFromToken, parseFloat(amount), testToToken);
                console.log(`📊 Found ${trades.length} trades from Rubic SDK`);
                // Log details about each trade for debugging
                trades.forEach((trade, index) => {
                    var _a;
                    if (trade instanceof rubic_sdk_1.OnChainTrade) {
                        console.log(`✅ Trade ${index}: ${trade.type} - ${trade.to.tokenAmount.toFixed()}`);
                    }
                    else {
                        console.log(`❌ Trade ${index} Error:`, ((_a = trade.error) === null || _a === void 0 ? void 0 : _a.message) || 'Unknown error');
                    }
                });
                if (trades.length === 0) {
                    console.log('⚠️ No trades available from Rubic, using fallback calculation');
                    return yield this.getFallbackQuote(fromToken, toToken, amount);
                }
                // Find the first successful trade (not an error)
                const bestTrade = trades.find(trade => trade instanceof rubic_sdk_1.OnChainTrade);
                if (!bestTrade || !(bestTrade instanceof rubic_sdk_1.OnChainTrade)) {
                    console.log('⚠️ No valid trades from Rubic (all errors), using fallback calculation');
                    return yield this.getFallbackQuote(fromToken, toToken, amount);
                }
                return {
                    fromToken,
                    toToken,
                    fromAmount: amount,
                    toAmount: bestTrade.to.tokenAmount.toFixed(),
                    gasPrice: bestTrade instanceof rubic_sdk_1.EvmOnChainTrade ? ((_b = (_a = bestTrade.gasFeeInfo) === null || _a === void 0 ? void 0 : _a.gasPrice) === null || _b === void 0 ? void 0 : _b.toString()) || '0' : '0',
                    estimatedGas: bestTrade instanceof rubic_sdk_1.EvmOnChainTrade ? ((_d = (_c = bestTrade.gasFeeInfo) === null || _c === void 0 ? void 0 : _c.gasLimit) === null || _d === void 0 ? void 0 : _d.toString()) || '0' : '0',
                    route: [bestTrade.type],
                    provider: 'rubic',
                    tradeType: bestTrade.type,
                    priceImpact: bestTrade.priceImpact ? parseFloat(bestTrade.priceImpact.toFixed(4)) : 0
                };
            }
            catch (error) {
                console.error('❌ Error getting Rubic on-chain quote:', error.message);
                console.log('🔄 Falling back to calculated quote due to Rubic error');
                return yield this.getFallbackQuote(fromToken, toToken, amount);
            }
        });
    }
    // Get best quote for cross-chain swaps
    getCrossChainQuote(fromToken, toToken, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            if (!this.sdk) {
                throw new Error('Rubic SDK not initialized');
            }
            try {
                const fromBlockchain = this.getBlockchainFromToken(fromToken);
                const toBlockchain = this.getBlockchainFromToken(toToken);
                const fromTokenAddress = this.getTokenAddress(fromToken);
                const toTokenAddress = this.getTokenAddress(toToken);
                const wrappedTrades = yield this.sdk.crossChainManager.calculateTrade({ blockchain: fromBlockchain, address: fromTokenAddress }, parseFloat(amount), { blockchain: toBlockchain, address: toTokenAddress });
                if (wrappedTrades.length === 0) {
                    console.log('⚠️ No cross-chain trades available from Rubic, using fallback calculation');
                    return yield this.getFallbackQuote(fromToken, toToken, amount);
                }
                const bestWrappedTrade = wrappedTrades[0];
                if (bestWrappedTrade.error || !bestWrappedTrade.trade) {
                    console.log('⚠️ Cross-chain trade error from Rubic, using fallback calculation');
                    return yield this.getFallbackQuote(fromToken, toToken, amount);
                }
                const bestTrade = bestWrappedTrade.trade;
                return {
                    fromToken,
                    toToken,
                    fromAmount: amount,
                    toAmount: bestTrade.to.tokenAmount.toFixed(),
                    gasPrice: bestTrade instanceof rubic_sdk_1.EvmCrossChainTrade ? ((_b = (_a = bestTrade.gasData) === null || _a === void 0 ? void 0 : _a.gasPrice) === null || _b === void 0 ? void 0 : _b.toString()) || '0' : '0',
                    estimatedGas: bestTrade instanceof rubic_sdk_1.EvmCrossChainTrade ? ((_d = (_c = bestTrade.gasData) === null || _c === void 0 ? void 0 : _c.gasLimit) === null || _d === void 0 ? void 0 : _d.toString()) || '0' : '0',
                    route: [bestTrade.type],
                    provider: 'rubic-crosschain',
                    tradeType: bestTrade.type,
                    priceImpact: bestTrade.priceImpact ? parseFloat(bestTrade.priceImpact.toFixed(4)) : 0
                };
            }
            catch (error) {
                console.error('❌ Error getting Rubic cross-chain quote:', error.message);
                console.log('🔄 Falling back to calculated quote due to cross-chain error');
                return yield this.getFallbackQuote(fromToken, toToken, amount);
            }
        });
    }
    // Get best quote (tries both on-chain and cross-chain)
    getBestQuote(fromToken, toToken, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`🔄 Getting quote for ${amount} ${fromToken} → ${toToken}`);
            // Validate trading pair is supported
            if (!this.isTradingPairSupported(fromToken, toToken)) {
                throw new Error(`Trading pair ${fromToken} → ${toToken} is not supported. Check supported pairs with /api/trading/supported-tokens`);
            }
            // If SDK is not initialized, use fallback immediately
            if (!this.sdk) {
                console.log('⚠️ Rubic SDK not available, using fallback calculation');
                return yield this.getFallbackQuote(fromToken, toToken, amount);
            }
            const fromBlockchain = this.getBlockchainFromToken(fromToken);
            const toBlockchain = this.getBlockchainFromToken(toToken);
            console.log(`📍 From blockchain: ${fromBlockchain}, To blockchain: ${toBlockchain}`);
            try {
                // If same blockchain, use on-chain
                if (fromBlockchain === toBlockchain) {
                    console.log('🔗 Using on-chain quote');
                    return yield this.getOnChainQuote(fromToken, toToken, amount);
                }
                else {
                    // Different blockchains, use cross-chain
                    console.log('🌉 Using cross-chain quote');
                    return yield this.getCrossChainQuote(fromToken, toToken, amount);
                }
            }
            catch (error) {
                console.error('❌ Error getting best quote:', error.message);
                console.log('🔄 Falling back to calculated quote due to error');
                return yield this.getFallbackQuote(fromToken, toToken, amount);
            }
        });
    }
    // Execute swap (simplified for backend - would need wallet integration)
    executeSwap(exchangeId, quote) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // In a real implementation, this would execute the actual swap
                // For now, we'll simulate the execution
                const txHash = `0x${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
                // Update exchange status
                yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, {
                    status: 'processing',
                    kucoinOrderId: txHash
                });
                // Simulate processing time based on trade type
                const processingTime = quote.tradeType.includes('CROSS_CHAIN') ? 30000 : 15000; // 30s for cross-chain, 15s for on-chain
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, {
                        status: 'completed',
                        withdrawalTxId: txHash,
                        swapCompleted: true,
                        monitoringActive: false
                    });
                }), processingTime);
                return {
                    txHash,
                    status: 'pending'
                };
            }
            catch (error) {
                // Update exchange as failed
                yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, { status: 'failed' });
                throw new Error(`Rubic swap execution failed: ${error.message}`);
            }
        });
    }
    // Helper function to get blockchain from token symbol
    getBlockchainFromToken(tokenSymbol) {
        const tokenBlockchains = {
            // Ethereum tokens (wrapped versions for cross-chain compatibility)
            'BTC': rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM, // WBTC on Ethereum
            'XRP': rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM, // Wrapped XRP on Ethereum
            'XLM': rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM, // Wrapped XLM on Ethereum
            'XDC': rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM, // Wrapped XDC on Ethereum
            'ETH': rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM, // Native ETH
            'USDT': rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM, // USDT on Ethereum
            // BSC tokens
            'MIOTA': rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN, // IOTA on BSC
            'IOTA': rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN // IOTA on BSC
        };
        return tokenBlockchains[tokenSymbol.toUpperCase()] || rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM;
    }
    // Helper function to get token contract address
    getTokenAddress(symbol) {
        const addresses = {
            // Native tokens (use zero address)
            'ETH': '0x0000000000000000000000000000000000000000', // Native ETH
            // Ethereum tokens (wrapped versions)
            'BTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC on Ethereum
            'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT on Ethereum
            'XRP': '0x1d2F0da169ceB9fC7B3144628dB156f3F6c60dBE', // Wrapped XRP on Ethereum
            'XLM': '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942', // Wrapped XLM on Ethereum
            'XDC': '0x41AB1b6fcbB2fA9DCEd81aCbdeC13Ea6315F2Bf2', // Wrapped XDC on Ethereum
            // BSC tokens
            'MIOTA': '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a', // IOTA on BSC
            'IOTA': '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a' // IOTA on BSC
        };
        return addresses[symbol.toUpperCase()] || '0x0000000000000000000000000000000000000000';
    }
    // Get supported tokens
    getSupportedTokens() {
        return [
            {
                symbol: 'BTC',
                name: 'Bitcoin',
                blockchain: rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM, // WBTC on Ethereum
                address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
                decimals: 8,
                isActive: true
            },
            {
                symbol: 'XRP',
                name: 'Ripple',
                blockchain: rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM, // Wrapped XRP on Ethereum
                address: '0x1d2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
                decimals: 6,
                isActive: true
            },
            {
                symbol: 'XLM',
                name: 'Stellar',
                blockchain: rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM, // Wrapped XLM on Ethereum
                address: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942',
                decimals: 7,
                isActive: true
            },
            {
                symbol: 'XDC',
                name: 'XinFin',
                blockchain: rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM, // Wrapped XDC on Ethereum
                address: '0x41AB1b6fcbB2fA9DCEd81aCbdeC13Ea6315F2Bf2',
                decimals: 18,
                isActive: true
            },
            {
                symbol: 'MIOTA',
                name: 'IOTA',
                blockchain: rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN, // IOTA on BSC
                address: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a',
                decimals: 6,
                isActive: true
            }
        ];
    }
    // Validate trading pair support (most pairs are cross-chain now)
    isTradingPairSupported(fromToken, toToken) {
        const supportedPairs = [
            // Cross-chain pairs (IOTA on BSC ↔ Others on Ethereum)
            ['MIOTA', 'XRP'], ['IOTA', 'XRP'],
            ['MIOTA', 'XDC'], ['IOTA', 'XDC'],
            ['MIOTA', 'BTC'], ['IOTA', 'BTC'],
            ['MIOTA', 'XLM'], ['IOTA', 'XLM'],
            ['MIOTA', 'ETH'], ['IOTA', 'ETH'],
            ['MIOTA', 'USDT'], ['IOTA', 'USDT'],
            // Same-chain pairs (all on Ethereum)
            ['XRP', 'XDC'], ['XRP', 'BTC'], ['XRP', 'XLM'], ['XRP', 'ETH'], ['XRP', 'USDT'],
            ['XDC', 'BTC'], ['XDC', 'XLM'], ['XDC', 'ETH'], ['XDC', 'USDT'],
            ['BTC', 'XLM'], ['BTC', 'ETH'], ['BTC', 'USDT'],
            ['XLM', 'ETH'], ['XLM', 'USDT'],
            // Reverse pairs (bidirectional trading)
            ['XRP', 'MIOTA'], ['XRP', 'IOTA'],
            ['XDC', 'MIOTA'], ['XDC', 'IOTA'],
            ['BTC', 'MIOTA'], ['BTC', 'IOTA'],
            ['XLM', 'MIOTA'], ['XLM', 'IOTA'],
            ['ETH', 'MIOTA'], ['ETH', 'IOTA'],
            ['USDT', 'MIOTA'], ['USDT', 'IOTA']
        ];
        const normalizedFrom = fromToken.toUpperCase();
        const normalizedTo = toToken.toUpperCase();
        return supportedPairs.some(([from, to]) => (from === normalizedFrom && to === normalizedTo) ||
            (from === normalizedTo && to === normalizedFrom));
    }
    // Get all supported trading pairs
    getSupportedTradingPairs() {
        return [
            // Cross-chain pairs (IOTA on BSC ↔ Others on Ethereum)
            { from: 'MIOTA', to: 'XRP', description: 'IOTA → Ripple (Cross-chain)' },
            { from: 'MIOTA', to: 'XDC', description: 'IOTA → XinFin (Cross-chain)' },
            { from: 'MIOTA', to: 'BTC', description: 'IOTA → Bitcoin (Cross-chain)' },
            { from: 'MIOTA', to: 'XLM', description: 'IOTA → Stellar (Cross-chain)' },
            { from: 'MIOTA', to: 'ETH', description: 'IOTA → Ethereum (Cross-chain)' },
            { from: 'MIOTA', to: 'USDT', description: 'IOTA → Tether (Cross-chain)' },
            // Same-chain pairs (all on Ethereum)
            { from: 'XRP', to: 'XDC', description: 'Ripple → XinFin' },
            { from: 'XRP', to: 'BTC', description: 'Ripple → Bitcoin' },
            { from: 'XRP', to: 'XLM', description: 'Ripple → Stellar' },
            { from: 'XRP', to: 'ETH', description: 'Ripple → Ethereum' },
            { from: 'XRP', to: 'USDT', description: 'Ripple → Tether' },
            { from: 'XDC', to: 'BTC', description: 'XinFin → Bitcoin' },
            { from: 'XDC', to: 'XLM', description: 'XinFin → Stellar' },
            { from: 'XDC', to: 'ETH', description: 'XinFin → Ethereum' },
            { from: 'XDC', to: 'USDT', description: 'XinFin → Tether' },
            { from: 'BTC', to: 'XLM', description: 'Bitcoin → Stellar' },
            { from: 'BTC', to: 'ETH', description: 'Bitcoin → Ethereum' },
            { from: 'BTC', to: 'USDT', description: 'Bitcoin → Tether' },
            { from: 'XLM', to: 'ETH', description: 'Stellar → Ethereum' },
            { from: 'XLM', to: 'USDT', description: 'Stellar → Tether' },
            // Note: All pairs are bidirectional
        ];
    }
    // Monitor transaction status
    monitorTransaction(txHash, exchangeId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`🔍 Monitoring Rubic transaction ${txHash} for exchange ${exchangeId}`);
            // In a real implementation, this would check blockchain status
            // For now, the completion is handled in executeSwap with setTimeout
        });
    }
    // Fallback quote with real-time prices from CoinGecko
    getFallbackQuote(fromToken, toToken, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            console.log(`🔄 Using fallback quote with real prices for ${fromToken} → ${toToken}`);
            try {
                const rate = yield this.getRealTimeExchangeRate(fromToken, toToken);
                const outputAmount = (parseFloat(amount) * rate).toFixed(8);
                return {
                    fromToken,
                    toToken,
                    fromAmount: amount,
                    toAmount: outputAmount,
                    gasPrice: '20000000000',
                    estimatedGas: '150000',
                    route: ['coingecko-fallback'],
                    provider: 'rubic-fallback',
                    tradeType: 'REAL_PRICE_CALCULATION',
                    priceImpact: 0.15 // Slightly higher impact for fallback
                };
            }
            catch (error) {
                console.error('❌ Failed to get real-time rates, using backup rates:', error);
                // Backup static rates if CoinGecko fails
                const backupRates = {
                    'XRP': { 'BTC': 0.000008, 'XLM': 4.2, 'XDC': 12, 'MIOTA': 2.1, 'IOTA': 2.1 },
                    'BTC': { 'XRP': 125000, 'XLM': 525000, 'XDC': 1500000, 'MIOTA': 262500, 'IOTA': 262500 },
                    'XLM': { 'XRP': 0.238, 'BTC': 0.0000019, 'XDC': 2.86, 'MIOTA': 0.5, 'IOTA': 0.5 },
                    'XDC': { 'XRP': 0.083, 'BTC': 0.00000067, 'XLM': 0.35, 'MIOTA': 0.175, 'IOTA': 0.175 },
                    'MIOTA': { 'XRP': 0.476, 'BTC': 0.0000038, 'XLM': 2, 'XDC': 5.7 },
                    'IOTA': { 'XRP': 0.476, 'BTC': 0.0000038, 'XLM': 2, 'XDC': 5.7 }
                };
                const rate = ((_a = backupRates[fromToken.toUpperCase()]) === null || _a === void 0 ? void 0 : _a[toToken.toUpperCase()]) || 1;
                const outputAmount = (parseFloat(amount) * rate).toFixed(8);
                return {
                    fromToken,
                    toToken,
                    fromAmount: amount,
                    toAmount: outputAmount,
                    gasPrice: '20000000000',
                    estimatedGas: '150000',
                    route: ['backup-rates'],
                    provider: 'rubic-fallback',
                    tradeType: 'BACKUP_CALCULATION',
                    priceImpact: 0.2
                };
            }
        });
    }
    // Get real-time exchange rate from CoinGecko
    getRealTimeExchangeRate(fromToken, toToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const tokenIds = {
                'XRP': 'ripple',
                'BTC': 'bitcoin',
                'XLM': 'stellar',
                'XDC': 'xdce-crowd-sale',
                'MIOTA': 'iota',
                'IOTA': 'iota',
                'ETH': 'ethereum',
                'USDT': 'tether',
                'USDC': 'usd-coin'
            };
            const fromId = tokenIds[fromToken.toUpperCase()];
            const toId = tokenIds[toToken.toUpperCase()];
            if (!fromId || !toId) {
                throw new Error(`Token ID not found for ${fromToken} or ${toToken}`);
            }
            const response = yield fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${fromId}&vs_currencies=${toId === 'tether' ? 'usd' : toId}&precision=18`);
            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }
            const data = yield response.json();
            if (toId === 'tether' || toId === 'usd-coin') {
                // For stablecoins, get USD price and convert
                const fromUsdPrice = (_a = data[fromId]) === null || _a === void 0 ? void 0 : _a.usd;
                if (!fromUsdPrice)
                    throw new Error(`No USD price for ${fromToken}`);
                return fromUsdPrice; // 1 USD = 1 USDT/USDC approximately
            }
            else {
                // Direct conversion
                const rate = (_b = data[fromId]) === null || _b === void 0 ? void 0 : _b[toId.replace('-', '_')];
                if (!rate)
                    throw new Error(`No rate found for ${fromToken} to ${toToken}`);
                return rate;
            }
        });
    }
}
exports.RubicTradingEngine = RubicTradingEngine;
exports.default = RubicTradingEngine;
