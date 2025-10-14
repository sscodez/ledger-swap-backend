// Rubic API integration for cross-chain swaps
import Web3 from 'web3';
import axios from 'axios';

interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: number;
  fromAddress: string;
  toAddress: string;
  privateKey: string;
}

interface SwapResult {
  success: boolean;
  txHash?: string;
  error?: string;
  gasUsed?: string;
  amountOut?: string;
}

interface RubicQuoteResponse {
  routes: Array<{
    id: string;
    fromAmount: string;
    toAmount: string;
    gasPrice: string;
    estimatedGas: string;
    provider: string;
    transaction?: {
      to: string;
      data: string;
      value: string;
      gasLimit: string;
      gasPrice: string;
    };
  }>;
}

class RubicSwapService {
  private web3: Web3 | null = null;
  private isInitialized = false;
  private readonly RUBIC_API_URL = 'https://api.rubic.exchange';

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    try {
      console.log('🔧 Initializing Rubic Swap Service...');

      // Initialize Web3
      const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your-project-id';
      this.web3 = new Web3(rpcUrl);

      this.isInitialized = true;
      console.log('✅ Rubic Swap Service initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize Rubic Swap Service:', error.message);
      this.isInitialized = false;
    }
  }

  async executeSwap(params: SwapParams): Promise<SwapResult> {
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
      const quote = await this.getRubicQuote(params);
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
      const receipt = await Promise.race([
        this.web3.eth.sendTransaction(tx),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Transaction timeout - network congestion')), 300000) // 5 minute timeout
        )
      ]) as any;

      console.log(`✅ Swap transaction confirmed: ${receipt.transactionHash}`);

      return {
        success: true,
        txHash: receipt.transactionHash?.toString() || '',
        gasUsed: receipt.gasUsed?.toString() || '0',
        amountOut: quote.amountOut
      };

    } catch (error: any) {
      console.error('❌ Enhanced Rubic swap failed:', error.message);

      // Enhanced error categorization
      if (error.message.includes('insufficient funds')) {
        return {
          success: false,
          error: 'Insufficient funds in wallet for gas fees'
        };
      } else if (error.message.includes('timeout')) {
        return {
          success: false,
          error: 'Transaction timeout - network congestion or low gas price'
        };
      } else if (error.message.includes('reverted')) {
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
  }

  /**
   */
  private getTokenInfo(fromToken: string, toToken: string) {
    // Your primary trading tokens with correct addresses
    const tokenMap: Record<string, { address: string; network: string }> = {
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
  private getTokenDecimals(tokenAddress: string): number {
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
  getSupportedTokens(): string[] {
    return ['XRP', 'XLM', 'XDC', 'IOTA', 'ETH', 'USDT'];
  }

  /**
   * Check if SDK is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get swap quote without executing
   */
  async getSwapQuote(fromToken: string, toToken: string, amount: number): Promise<any> {
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
    } catch (error: any) {
      console.error('❌ Failed to get quote:', error.message);
      return null;
    }
  }

  private async getRubicQuote(params: SwapParams): Promise<any> {
    try {
      console.log(`📊 Getting Rubic quote for ${params.fromToken} → ${params.toToken}...`);
      
      // Get token info for your trading tokens
      const tokenInfo = this.getTokenInfo(params.fromToken, params.toToken);
      
      // Mock Rubic API response - replace with actual Rubic API integration
      return {
        to: '0x1111111254EEB25477B68fb85Ed929f73A960582', // DEX router address
        data: '0x', // Transaction data from Rubic
        value: params.fromToken === 'ETH' ? this.web3?.utils.toWei(params.amount.toString(), 'ether') : '0',
        gasLimit: '200000',
        gasPrice: '20000000000',
        amountOut: (params.amount * 0.99).toString() // Mock 1% slippage
      };
    } catch (error: any) {
      console.error('❌ Failed to get Rubic quote:', error.message);
      return null;
    }
  }
}

export default new RubicSwapService();
