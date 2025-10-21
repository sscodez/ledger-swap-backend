import mongoose, { Document, Schema } from 'mongoose';

export interface IToken extends Document {
  key: string; // unique token key, e.g., 'usdc-ethereum', 'xrp-trustline'
  symbol: string; // e.g., 'USDC', 'XRP', 'USDT'
  name: string; // e.g., 'USD Coin', 'Ripple'
  chainKey: string; // reference to Chain.key: 'bitcoin', 'stellar', 'xrp-ledger', 'xdc-network', 'iota'
  tokenType: 'native' | 'erc20' | 'bep20' | 'trc20' | 'xrc20' | 'stellar-asset' | 'xrp-trustline' | 'iota-token';
  contractAddress?: string; // Smart contract address (for ERC20, BEP20, XRC20, etc.)
  issuerAddress?: string; // For Stellar assets and XRP trustlines
  decimals: number; // Token decimals (e.g., 18 for most ERC20, 6 for USDT)
  iconUrl?: string; // Token icon/logo URL
  coingeckoId?: string; // CoinGecko API ID for price feeds
  minSwapAmount: string; // Minimum amount for swaps
  maxSwapAmount: string; // Maximum amount for swaps
  enabled: boolean;
  isStablecoin: boolean;
  liquidityScore: number; // 0-100 indicating liquidity availability
  metadata: {
    website?: string;
    description?: string;
    marketCap?: string;
  };
}

const tokenSchema: Schema = new Schema({
  key: { type: String,  unique: true, index: true },
  symbol: { type: String,  index: true },
  name: { type: String, required: true },
  chainKey: { type: String, required: true, index: true },
  tokenType: {
    type: String,
    enum: ['native', 'erc20', 'bep20', 'trc20', 'xrc20', 'stellar-asset', 'xrp-trustline', 'iota-token'],
  
  },
  tokenAddress: { type: String, index: true },
  issuerAddress: { type: String },
  decimals: { type: Number, required: true, default: 18 },
  icon: { type: String },
  coingeckoId: { type: String, index: true },
  minSwapAmount: { type: String, default: '0' },
  maxSwapAmount: { type: String, default: '1000000000' },
  enabled: { type: Boolean, default: true, index: true },
  isStablecoin: { type: Boolean, default: false },
  liquidityScore: { type: Number, default: 50, min: 0, max: 100 },
  metadata: {
    website: { type: String },
    description: { type: String },
    marketCap: { type: String }
  }
}, { timestamps: true });

// Compound indexes for efficient queries
tokenSchema.index({ chainKey: 1, enabled: 1 });
tokenSchema.index({ symbol: 1, chainKey: 1 });
tokenSchema.index({ enabled: 1, liquidityScore: -1 });

const Token = mongoose.model<IToken>('Token', tokenSchema);
export default Token;
