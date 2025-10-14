// Common interface for all trading engines
export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  gasPrice: string;
  estimatedGas: string;
  route: any[];
  provider: string;
  tradeType: string;
  tradeId?: string; // Optional trade ID for caching
  priceImpact: number;
}

export interface SwapExecution {
  txHash: string;
  status: 'pending' | 'completed' | 'failed';
  gasUsed?: string;
  actualAmountOut?: string;
}

export interface ITradingEngine {
  // Core Rubic methods only
  getBestQuote(fromToken: string, toToken: string, amount: string): Promise<SwapQuote>;
  executeSwap(exchangeId: string, quote: SwapQuote): Promise<SwapExecution>;
  monitorTransaction(txHash: string, exchangeId: string): Promise<void>;
  
  // Rubic SDK methods
  getSupportedTokens(): any[];
  getSupportedTradingPairs(): any[];
  initialize(): Promise<void>;
}

export { SwapQuote as ISwapQuote, SwapExecution as ISwapExecution };
