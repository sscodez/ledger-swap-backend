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
                        process.env.INFURA_ETHEREUM_RPC || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
                        'https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY'
                    ]
                },
                [rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: {
                    rpcList: [
                        'https://bsc-dataseed.binance.org/',
                        'https://bsc-dataseed1.defibit.io/'
                    ]
                },
                [rubic_sdk_1.BLOCKCHAIN_NAME.POLYGON]: {
                    rpcList: [
                        'https://polygon-rpc.com/',
                        'https://rpc-mainnet.maticvigil.com/'
                    ]
                },
                [rubic_sdk_1.BLOCKCHAIN_NAME.ARBITRUM]: {
                    rpcList: [
                        'https://arb1.arbitrum.io/rpc',
                        'https://arbitrum-mainnet.infura.io/v3/YOUR_PROJECT_ID'
                    ]
                }
            },
            providerAddress: {
                [rubic_sdk_1.CHAIN_TYPE.EVM]: {
                    crossChain: process.env.RUBIC_CROSS_CHAIN_FEE_ADDRESS || '0x0000000000000000000000000000000000000000',
                    onChain: process.env.RUBIC_ON_CHAIN_FEE_ADDRESS || '0x0000000000000000000000000000000000000000'
                }
            }
        };
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔄 Initializing Rubic SDK with config:', JSON.stringify(this.config, null, 2));
                this.sdk = yield rubic_sdk_1.SDK.createSDK(this.config);
                console.log('✅ Rubic SDK initialized successfully');
            }
            catch (error) {
                console.error('❌ Failed to initialize Rubic SDK:', error.message);
                console.error('❌ Full error:', error);
                throw error;
            }
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
                const trades = yield this.sdk.onChainManager.calculateTrade({ blockchain, address: fromTokenAddress }, parseFloat(amount), toTokenAddress);
                if (trades.length === 0) {
                    throw new Error('No trades available');
                }
                const bestTrade = trades[0];
                if (!bestTrade || !(bestTrade instanceof rubic_sdk_1.OnChainTrade)) {
                    throw new Error(`Trade calculation failed: ${(bestTrade === null || bestTrade === void 0 ? void 0 : bestTrade.error) || 'No trades available'}`);
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
                console.error('Error getting Rubic on-chain quote:', error);
                throw error;
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
                    throw new Error('No cross-chain trades available');
                }
                const bestWrappedTrade = wrappedTrades[0];
                if (bestWrappedTrade.error || !bestWrappedTrade.trade) {
                    throw new Error(`Cross-chain trade calculation failed: ${bestWrappedTrade.error}`);
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
                console.error('Error getting Rubic cross-chain quote:', error);
                throw error;
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
                console.error('❌ Full error details:', error);
                throw error;
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
            // BTCB on BSC
            'ETH': rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM,
            'USDT': rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM,
            'USDC': rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM,
            'BTC': rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
            'XRP': rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN, // XRP on BSC
            'XLM': rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN, // XLM on BSC
            'XDC': rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM, // XDC on BSC
            'MIOTA': rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN, // IOTA on BSC
            'IOTA': rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN, // IOTA on BSC
            'BNB': rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
            'MATIC': rubic_sdk_1.BLOCKCHAIN_NAME.POLYGON,
            'ARB': rubic_sdk_1.BLOCKCHAIN_NAME.ARBITRUM
        };
        return tokenBlockchains[tokenSymbol.toUpperCase()] || rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM;
    }
    // Helper function to get token contract address
    getTokenAddress(symbol) {
        const addresses = {
            'ETH': '0x0000000000000000000000000000000000000000', // Native ETH
            'BTC': '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // WBTC
            'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
            'USDC': '0xA0b86a33E6441b8bB770794D5C0495c13DCE7Ec0', // USDC
            'XRP': '0x1d2F0da169ceB9fC7B3144628dB156f3F6c60dBE', // XRP binance
            'XLM': '0x43C934A845205F0b514417d757d7235B8f53f1B9', // XLM
            'XDC': '0x41AB1b6fcbB2fA9DCEd81aCbdeC13Ea6315F2Bf2', // XDC on Ethereum
            'MIOTA': '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a', // IOTA (Binance-Peg IOTA Token)
            'IOTA': '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a', // IOTA (Binance-Peg IOTA Token)
            'BNB': '0x0000000000000000000000000000000000000000', // Native BNB
            'MATIC': '0x0000000000000000000000000000000000000000', // Native MATIC
            'ARB': '0x0000000000000000000000000000000000000000' // Native ARB
        };
        return addresses[symbol.toUpperCase()] || '0x0000000000000000000000000000000000000000';
    }
    // Get supported tokens
    getSupportedTokens() {
        return [
            {
                symbol: 'BTC',
                name: 'Bitcoin',
                blockchain: rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
                address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
                decimals: 8,
                isActive: true
            },
            {
                symbol: 'XRP',
                name: 'Ripple',
                blockchain: rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
                address: '0x1d2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
                decimals: 6,
                isActive: true
            },
            {
                symbol: 'XLM',
                name: 'Stellar',
                blockchain: rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
                address: '0x43C934A845205F0b514417d757d7235B8f53f1B9',
                decimals: 7,
                isActive: true
            },
            {
                symbol: 'XDC',
                name: 'XinFin',
                blockchain: rubic_sdk_1.BLOCKCHAIN_NAME.ETHEREUM,
                address: '0x41AB1b6fcbB2fA9DCEd81aCbdeC13Ea6315F2Bf2',
                decimals: 18,
                isActive: true
            },
            {
                symbol: 'MIOTA',
                name: 'IOTA',
                blockchain: rubic_sdk_1.BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
                address: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a',
                decimals: 6,
                isActive: true // Now using Binance-Peg IOTA Token
            }
        ];
    }
    // Validate trading pair support
    isTradingPairSupported(fromToken, toToken) {
        const supportedPairs = [
            // IOTA pairs
            ['MIOTA', 'XRP'], ['IOTA', 'XRP'],
            ['MIOTA', 'XDC'], ['IOTA', 'XDC'],
            ['MIOTA', 'BTC'], ['IOTA', 'BTC'],
            ['MIOTA', 'XLM'], ['IOTA', 'XLM'],
            // XRP pairs
            ['XRP', 'XDC'], ['XRP', 'BTC'], ['XRP', 'XLM'],
            // XDC pairs
            ['XDC', 'BTC'], ['XDC', 'XLM'],
            // BTC pairs
            ['BTC', 'XLM'],
            // Reverse pairs (bidirectional trading)
            ['XRP', 'MIOTA'], ['XRP', 'IOTA'],
            ['XDC', 'MIOTA'], ['XDC', 'IOTA'],
            ['BTC', 'MIOTA'], ['BTC', 'IOTA'],
            ['XLM', 'MIOTA'], ['XLM', 'IOTA'],
            ['XDC', 'XRP'], ['BTC', 'XRP'], ['XLM', 'XRP'],
            ['BTC', 'XDC'], ['XLM', 'XDC'],
            ['XLM', 'BTC']
        ];
        const normalizedFrom = fromToken.toUpperCase();
        const normalizedTo = toToken.toUpperCase();
        return supportedPairs.some(([from, to]) => (from === normalizedFrom && to === normalizedTo) ||
            (from === normalizedTo && to === normalizedFrom));
    }
    // Get all supported trading pairs
    getSupportedTradingPairs() {
        return [
            // IOTA trading pairs
            { from: 'MIOTA', to: 'XRP', description: 'IOTA → Ripple' },
            { from: 'MIOTA', to: 'XDC', description: 'IOTA → XinFin' },
            { from: 'MIOTA', to: 'BTC', description: 'IOTA → Bitcoin' },
            { from: 'MIOTA', to: 'XLM', description: 'IOTA → Stellar' },
            // XRP trading pairs
            { from: 'XRP', to: 'XDC', description: 'Ripple → XinFin' },
            { from: 'XRP', to: 'BTC', description: 'Ripple → Bitcoin' },
            { from: 'XRP', to: 'XLM', description: 'Ripple → Stellar' },
            // XDC trading pairs
            { from: 'XDC', to: 'BTC', description: 'XinFin → Bitcoin' },
            { from: 'XDC', to: 'XLM', description: 'XinFin → Stellar' },
            // BTC trading pairs
            { from: 'BTC', to: 'XLM', description: 'Bitcoin → Stellar' },
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
}
exports.RubicTradingEngine = RubicTradingEngine;
exports.default = RubicTradingEngine;
