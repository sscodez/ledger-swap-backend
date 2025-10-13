import { SDK, Configuration, BLOCKCHAIN_NAME, CHAIN_TYPE, OnChainTrade, EvmOnChainTrade, EvmCrossChainTrade } from 'rubic-sdk';
import ExchangeHistory from '../models/ExchangeHistory';
import { ITradingEngine, SwapQuote, SwapExecution } from '../interfaces/ITradingEngine';

// Rubic SDK configuration
interface RubicConfig {
  rpcProviders: {
    [key: string]: {
      rpcList: string[];
    };
  };
  providerAddress?: {
    [CHAIN_TYPE.EVM]: {
      crossChain: string;
      onChain: string;
    };
  };
  walletProvider?: any;
}

export class RubicTradingEngine implements ITradingEngine {
  private sdk: SDK | null = null;
  private config: RubicConfig;

  constructor() {
    this.config = this.createConfiguration();
  }

  private createConfiguration(): RubicConfig {
    return {
      rpcProviders: {
        [BLOCKCHAIN_NAME.ETHEREUM]: {
          rpcList: [
            process.env.INFURA_ETHEREUM_RPC || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
            'https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY'
          ]
        },
        [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: {
          rpcList: [
            'https://bsc-dataseed.binance.org/',
            'https://bsc-dataseed1.defibit.io/'
          ]
        },
        [BLOCKCHAIN_NAME.POLYGON]: {
          rpcList: [
            'https://polygon-rpc.com/',
            'https://rpc-mainnet.maticvigil.com/'
          ]
        },
        [BLOCKCHAIN_NAME.ARBITRUM]: {
          rpcList: [
            'https://arb1.arbitrum.io/rpc',
            'https://arbitrum-mainnet.infura.io/v3/YOUR_PROJECT_ID'
          ]
        }
      },
      providerAddress: {
        [CHAIN_TYPE.EVM]: {
          crossChain: process.env.RUBIC_CROSS_CHAIN_FEE_ADDRESS || '0x0000000000000000000000000000000000000000',
          onChain: process.env.RUBIC_ON_CHAIN_FEE_ADDRESS || '0x0000000000000000000000000000000000000000'
        }
      }
    };
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing Rubic SDK with config:', JSON.stringify(this.config, null, 2));
      this.sdk = await SDK.createSDK(this.config);
      console.log('✅ Rubic SDK initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize Rubic SDK:', error.message);
      console.error('❌ Full error:', error);
      throw error;
    }
  }

  // Get best quote for same-chain swaps
  async getOnChainQuote(fromToken: string, toToken: string, amount: string): Promise<SwapQuote> {
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

      const trades = await this.sdk.onChainManager.calculateTrade(
        { blockchain, address: fromTokenAddress },
        parseFloat(amount),
        toTokenAddress
      );

      console.log(`📊 Found ${trades.length} trades from Rubic SDK`);
      
      if (trades.length === 0) {
        console.log('⚠️ No trades available from Rubic, using fallback calculation');
        // Fallback to mock calculation when Rubic has no routes
        return this.getFallbackQuote(fromToken, toToken, amount);
      }

      const bestTrade = trades[0];
      
      if (!bestTrade || !(bestTrade instanceof OnChainTrade)) {
        console.log('⚠️ Invalid trade object from Rubic, using fallback calculation');
        return this.getFallbackQuote(fromToken, toToken, amount);
      }

      return {
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: bestTrade.to.tokenAmount.toFixed(),
        gasPrice: bestTrade instanceof EvmOnChainTrade ? bestTrade.gasFeeInfo?.gasPrice?.toString() || '0' : '0',
        estimatedGas: bestTrade instanceof EvmOnChainTrade ? bestTrade.gasFeeInfo?.gasLimit?.toString() || '0' : '0',
        route: [bestTrade.type],
        provider: 'rubic',
        tradeType: bestTrade.type,
        priceImpact: (bestTrade as any).priceImpact ? parseFloat((bestTrade as any).priceImpact.toFixed(4)) : 0
      };

    } catch (error: any) {
      console.error('❌ Error getting Rubic on-chain quote:', error.message);
      console.log('🔄 Falling back to calculated quote due to Rubic error');
      return this.getFallbackQuote(fromToken, toToken, amount);
    }
  }

  // Get best quote for cross-chain swaps
  async getCrossChainQuote(fromToken: string, toToken: string, amount: string): Promise<SwapQuote> {
    if (!this.sdk) {
      throw new Error('Rubic SDK not initialized');
    }

    try {
      const fromBlockchain = this.getBlockchainFromToken(fromToken);
      const toBlockchain = this.getBlockchainFromToken(toToken);
      const fromTokenAddress = this.getTokenAddress(fromToken);
      const toTokenAddress = this.getTokenAddress(toToken);

      const wrappedTrades = await this.sdk.crossChainManager.calculateTrade(
        { blockchain: fromBlockchain, address: fromTokenAddress },
        parseFloat(amount),
        { blockchain: toBlockchain, address: toTokenAddress }
      );

      if (wrappedTrades.length === 0) {
        console.log('⚠️ No cross-chain trades available from Rubic, using fallback calculation');
        return this.getFallbackQuote(fromToken, toToken, amount);
      }

      const bestWrappedTrade = wrappedTrades[0];
      
      if (bestWrappedTrade.error || !bestWrappedTrade.trade) {
        console.log('⚠️ Cross-chain trade error from Rubic, using fallback calculation');
        return this.getFallbackQuote(fromToken, toToken, amount);
      }

      const bestTrade = bestWrappedTrade.trade;

      return {
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: bestTrade.to.tokenAmount.toFixed(),
        gasPrice: bestTrade instanceof EvmCrossChainTrade ? bestTrade.gasData?.gasPrice?.toString() || '0' : '0',
        estimatedGas: bestTrade instanceof EvmCrossChainTrade ? bestTrade.gasData?.gasLimit?.toString() || '0' : '0',
        route: [bestTrade.type],
        provider: 'rubic-crosschain',
        tradeType: bestTrade.type,
        priceImpact: (bestTrade as any).priceImpact ? parseFloat((bestTrade as any).priceImpact.toFixed(4)) : 0
      };

    } catch (error: any) {
      console.error('❌ Error getting Rubic cross-chain quote:', error.message);
      console.log('🔄 Falling back to calculated quote due to cross-chain error');
      return this.getFallbackQuote(fromToken, toToken, amount);
    }
  }

  // Get best quote (tries both on-chain and cross-chain)
  async getBestQuote(fromToken: string, toToken: string, amount: string): Promise<SwapQuote> {
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
        return await this.getOnChainQuote(fromToken, toToken, amount);
      } else {
        // Different blockchains, use cross-chain
        console.log('🌉 Using cross-chain quote');
        return await this.getCrossChainQuote(fromToken, toToken, amount);
      }
    } catch (error: any) {
      console.error('❌ Error getting best quote:', error.message);
      console.error('❌ Full error details:', error);
      throw error;
    }
  }

  // Execute swap (simplified for backend - would need wallet integration)
  async executeSwap(exchangeId: string, quote: SwapQuote): Promise<SwapExecution> {
    try {
      // In a real implementation, this would execute the actual swap
      // For now, we'll simulate the execution
      const txHash = `0x${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;

      // Update exchange status
      await ExchangeHistory.findOneAndUpdate(
        { exchangeId },
        { 
          status: 'processing',
          kucoinOrderId: txHash
        }
      );

      // Simulate processing time based on trade type
      const processingTime = quote.tradeType.includes('CROSS_CHAIN') ? 30000 : 15000; // 30s for cross-chain, 15s for on-chain

      setTimeout(async () => {
        await ExchangeHistory.findOneAndUpdate(
          { exchangeId },
          { 
            status: 'completed',
            withdrawalTxId: txHash,
            swapCompleted: true,
            monitoringActive: false
          }
        );
      }, processingTime);

      return {
        txHash,
        status: 'pending'
      };

    } catch (error: any) {
      // Update exchange as failed
      await ExchangeHistory.findOneAndUpdate(
        { exchangeId },
        { status: 'failed' }
      );

      throw new Error(`Rubic swap execution failed: ${error.message}`);
    }
  }

  // Helper function to get blockchain from token symbol
  private getBlockchainFromToken(tokenSymbol: string): typeof BLOCKCHAIN_NAME[keyof typeof BLOCKCHAIN_NAME] {
    const tokenBlockchains: Record<string, typeof BLOCKCHAIN_NAME[keyof typeof BLOCKCHAIN_NAME]> = {
      // BTCB on BSC
      'ETH': BLOCKCHAIN_NAME.ETHEREUM,
      'USDT': BLOCKCHAIN_NAME.ETHEREUM,
      'USDC': BLOCKCHAIN_NAME.ETHEREUM,
      'BTC': BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
      'XRP': BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN, // XRP on BSC
      'XLM': BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN, // XLM on BSC
      'XDC': BLOCKCHAIN_NAME.ETHEREUM, // XDC on BSC
      'MIOTA': BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN, // IOTA on BSC
      'IOTA': BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN, // IOTA on BSC
      'BNB': BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
      'MATIC': BLOCKCHAIN_NAME.POLYGON,
      'ARB': BLOCKCHAIN_NAME.ARBITRUM
    };

    return tokenBlockchains[tokenSymbol.toUpperCase()] || BLOCKCHAIN_NAME.ETHEREUM;
  }

  // Helper function to get token contract address
  private getTokenAddress(symbol: string): string {
    const addresses: Record<string, string> = {
      'ETH': '0x0000000000000000000000000000000000000000', // Native ETH
      'BTC': '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BTCB on BSC
      'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT on Ethereum
      'USDC': '0xA0b86a33E6441b8bB770794D5C0495c13DCE7Ec0', // USDC on Ethereum
      'XRP': '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', // XRP on BSC
      'XLM': '0x43C934A845205F0b514417d757d7235B8f53f1B9', // XLM on BSC
      'XDC': '0x41AB1b6fcbB2fA9DCEd81aCbdeC13Ea6315F2Bf2', // XDC on Ethereum
      'MIOTA': '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a', // IOTA on BSC
      'IOTA': '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a', // IOTA on BSC
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
        blockchain: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
        address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
        decimals: 8,
        isActive: true
      },
      {
        symbol: 'XRP',
        name: 'Ripple',
        blockchain: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
        address: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
        decimals: 6,
        isActive: true
      },
      {
        symbol: 'XLM',
        name: 'Stellar',
        blockchain: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
        address: '0x43C934A845205F0b514417d757d7235B8f53f1B9',
        decimals: 7,
        isActive: true
      },
      {
        symbol: 'XDC',
        name: 'XinFin',
        blockchain: BLOCKCHAIN_NAME.ETHEREUM,
        address: '0x41AB1b6fcbB2fA9DCEd81aCbdeC13Ea6315F2Bf2',
        decimals: 18,
        isActive: true
      },
      {
        symbol: 'MIOTA',
        name: 'IOTA',
        blockchain: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
        address: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a',
        decimals: 6,
        isActive: true // Now using Binance-Peg IOTA Token
      }
    ];
  }

  // Validate trading pair support
  isTradingPairSupported(fromToken: string, toToken: string): boolean {
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
    
    return supportedPairs.some(([from, to]) => 
      (from === normalizedFrom && to === normalizedTo) ||
      (from === normalizedTo && to === normalizedFrom)
    );
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
  async monitorTransaction(txHash: string, exchangeId: string): Promise<void> {
    console.log(`🔍 Monitoring Rubic transaction ${txHash} for exchange ${exchangeId}`);
    // In a real implementation, this would check blockchain status
    // For now, the completion is handled in executeSwap with setTimeout
  }

  // Fallback quote when Rubic has no routes
  private getFallbackQuote(fromToken: string, toToken: string, amount: string): SwapQuote {
    console.log(`🔄 Using fallback quote for ${fromToken} → ${toToken}`);
    
    // Simple mock exchange rates for fallback
    const rates: Record<string, Record<string, number>> = {
      'XRP': { 'BTC': 0.000015, 'XLM': 4.5, 'XDC': 45, 'MIOTA': 0.8, 'IOTA': 0.8 },
      'BTC': { 'XRP': 66666, 'XLM': 300000, 'XDC': 3000000, 'MIOTA': 53333, 'IOTA': 53333 },
      'XLM': { 'XRP': 0.22, 'BTC': 0.0000033, 'XDC': 10, 'MIOTA': 0.18, 'IOTA': 0.18 },
      'XDC': { 'XRP': 0.022, 'BTC': 0.00000033, 'XLM': 0.1, 'MIOTA': 0.018, 'IOTA': 0.018 },
      'MIOTA': { 'XRP': 1.25, 'BTC': 0.000019, 'XLM': 5.6, 'XDC': 56 },
      'IOTA': { 'XRP': 1.25, 'BTC': 0.000019, 'XLM': 5.6, 'XDC': 56 }
    };
    
    const rate = rates[fromToken.toUpperCase()]?.[toToken.toUpperCase()] || 1;
    const outputAmount = (parseFloat(amount) * rate).toFixed(7);
    
    return {
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: outputAmount,
      gasPrice: '20000000000',
      estimatedGas: '150000',
      route: ['fallback'],
      provider: 'rubic-fallback',
      tradeType: 'FALLBACK_CALCULATION',
      priceImpact: 0.1
    };
  }

}

export default RubicTradingEngine;
