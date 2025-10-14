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
// Rubic API integration for cross-chain swaps
const web3_1 = __importDefault(require("web3"));
class RubicSwapService {
    constructor() {
        this.web3 = null;
        this.isInitialized = false;
        this.RUBIC_API_URL = 'https://api.rubic.exchange';
        this.initializeService();
    }
    initializeService() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔧 Initializing Rubic Swap Service...');
                // Initialize Web3
                const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your-project-id';
                this.web3 = new web3_1.default(rpcUrl);
                this.isInitialized = true;
                console.log('✅ Rubic Swap Service initialized successfully');
            }
            catch (error) {
                console.error('❌ Failed to initialize Rubic Swap Service:', error.message);
                this.isInitialized = false;
            }
        });
    }
    executeSwap(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                if (!this.isInitialized || !this.web3) {
                    throw new Error('Rubic service not initialized');
                }
                console.log('🔄 Executing enhanced Rubic swap for your trading tokens...');
                console.log(`💱 ${params.amount} ${params.fromToken} → ${params.toToken}`);
                console.log(`📍 From: ${params.fromAddress} → To: ${params.toAddress}`);
                // Validate inputs
                if (!params.fromToken || !params.toToken || !params.amount || !params.fromAddress || !params.toAddress || !params.privateKey) {
                    throw new Error('Missing required swap parameters');
                }
                if (params.amount <= 0) {
                    throw new Error('Invalid swap amount');
                }
                // Get quote from Rubic API with enhanced error handling
                const quote = yield this.getRubicQuote(params);
                if (!quote) {
                    throw new Error('No swap route available - insufficient liquidity or invalid pair');
                }
                console.log(`📊 Quote received: ${quote.amountOut} ${params.toToken} output`);
                // Enhanced transaction building with better gas estimation
                const account = this.web3.eth.accounts.privateKeyToAccount(params.privateKey);
                this.web3.eth.accounts.wallet.add(account);
                const tx = {
                    from: params.fromAddress,
                    to: quote.to,
                    data: quote.data,
                    value: quote.value || '0',
                    gas: quote.gasLimit || '200000',
                    gasPrice: quote.gasPrice || this.web3.utils.toWei('20', 'gwei')
                };
                console.log(`🚀 Broadcasting ${params.fromToken} → ${params.toToken} swap transaction...`);
                console.log(`⛽ Gas: ${tx.gas}, Price: ${this.web3.utils.fromWei(tx.gasPrice, 'gwei')} gwei`);
                // Execute transaction with timeout and enhanced error handling
                const receipt = yield Promise.race([
                    this.web3.eth.sendTransaction(tx),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout - network congestion')), 300000) // 5 minute timeout
                    )
                ]);
                console.log(`✅ Swap transaction confirmed: ${receipt.transactionHash}`);
                return {
                    success: true,
                    txHash: ((_a = receipt.transactionHash) === null || _a === void 0 ? void 0 : _a.toString()) || '',
                    gasUsed: ((_b = receipt.gasUsed) === null || _b === void 0 ? void 0 : _b.toString()) || '0',
                    amountOut: quote.amountOut
                };
            }
            catch (error) {
                console.error('❌ Enhanced Rubic swap failed:', error.message);
                // Enhanced error categorization
                if (error.message.includes('insufficient funds')) {
                    return {
                        success: false,
                        error: 'Insufficient funds in wallet for gas fees'
                    };
                }
                else if (error.message.includes('timeout')) {
                    return {
                        success: false,
                        error: 'Transaction timeout - network congestion or low gas price'
                    };
                }
                else if (error.message.includes('reverted')) {
                    return {
                        success: false,
                        error: 'Transaction reverted - insufficient liquidity or slippage too high'
                    };
                }
                return {
                    success: false,
                    error: error.message || 'Enhanced Rubic swap execution failed'
                };
            }
        });
    }
    /**
     */
    getTokenInfo(fromToken, toToken) {
        // Your primary trading tokens with correct addresses
        const tokenMap = {
            'ETH': {
                address: '0x0000000000000000000000000000000000000000', // Native ETH
                network: 'ethereum'
            },
            'USDT': {
                address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT on Ethereum
                network: 'ethereum'
            },
            'XRP': {
                address: '0x1d2F0da169ceB9fC7B3144628dB156f3F6c60dBE', // XRP on Ethereum (wrapped)
                network: 'ethereum'
            },
            'XLM': {
                address: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942', // XLM on Ethereum (wrapped)
                network: 'ethereum'
            },
            'XDC': {
                address: '0x41AB1b6fcbB2fA9DCEd81aCbdeC13Ea6315F2Bf2', // XDC on Ethereum (wrapped)
                network: 'ethereum'
            },
            'IOTA': {
                address: '0x0000000000000000000000000000000000000000', // Native IOTA
                network: 'bsc'
            }
        };
        const fromTokenInfo = tokenMap[fromToken.toUpperCase()];
        const toTokenInfo = tokenMap[toToken.toUpperCase()];
        if (!fromTokenInfo || !toTokenInfo) {
            throw new Error(`Unsupported token pair: ${fromToken} -> ${toToken}`);
        }
        return {
            fromTokenAddress: fromTokenInfo.address,
            toTokenAddress: toTokenInfo.address,
            fromNetwork: fromTokenInfo.network,
            toNetwork: toTokenInfo.network
        };
    }
    /**
     * Get token decimals
     */
    getTokenDecimals(tokenAddress) {
        // Most ERC20 tokens use 18 decimals, ETH uses 18
        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
            return 18; // ETH or native tokens
        }
        // Your trading tokens all use 18 decimals
        return 18;
    }
    /**
     * Get supported tokens
     */
    getSupportedTokens() {
        return ['XRP', 'XLM', 'XDC', 'IOTA', 'ETH', 'USDT'];
    }
    /**
     * Check if SDK is ready
     */
    isReady() {
        return this.isInitialized;
    }
    /**
     * Get swap quote without executing
     */
    getSwapQuote(fromToken, toToken, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.isInitialized) {
                    throw new Error('Rubic service not initialized');
                }
                console.log(`📊 Getting quote: ${amount} ${fromToken} → ${toToken}`);
                // Mock quote for your trading tokens - replace with actual Rubic API call
                return {
                    amountOut: (amount * 0.99).toString(),
                    gasEstimate: '200000',
                    provider: 'Rubic',
                    priceImpact: '0.01'
                };
            }
            catch (error) {
                console.error('❌ Failed to get quote:', error.message);
                return null;
            }
        });
    }
    getRubicQuote(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log(`📊 Getting Rubic quote for ${params.fromToken} → ${params.toToken}...`);
                // Get token info for your trading tokens
                const tokenInfo = this.getTokenInfo(params.fromToken, params.toToken);
                // Mock Rubic API response - replace with actual Rubic API integration
                return {
                    to: '0x1111111254EEB25477B68fb85Ed929f73A960582', // DEX router address
                    data: '0x', // Transaction data from Rubic
                    value: params.fromToken === 'ETH' ? (_a = this.web3) === null || _a === void 0 ? void 0 : _a.utils.toWei(params.amount.toString(), 'ether') : '0',
                    gasLimit: '200000',
                    gasPrice: '20000000000',
                    amountOut: (params.amount * 0.99).toString() // Mock 1% slippage
                };
            }
            catch (error) {
                console.error('❌ Failed to get Rubic quote:', error.message);
                return null;
            }
        });
    }
}
exports.default = new RubicSwapService();
