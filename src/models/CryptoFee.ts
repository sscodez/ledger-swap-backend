import mongoose, { Document, Schema } from 'mongoose';

export interface ICryptoFee extends Document {
  cryptocurrency: string;
  symbol: string;
  feePercentage: number;
  minimumFee: number;
  maximumFee: number;
  isActive: boolean;
  // Fee collection wallet address where fees are sent
  feeCollectionAddress: string;
  // Deposit address fields for automated swaps
  depositAddress?: string;
  depositMemo?: string; // For currencies like XRP, XLM that need memo/tag
  depositNetwork?: string; // Network specification (e.g., 'ERC20', 'TRC20', 'BEP20')
  // Private key for automated swaps (encrypted)
  privateKey?: string; // Encrypted private key for Rubic swaps
  walletAddress?: string; // Public wallet address (derived from private key)
  createdAt: Date;
  updatedAt: Date;
}

const CryptoFeeSchema: Schema = new Schema({
  cryptocurrency: {
    type: String,
    required: true,
    unique: true,
    enum: ['Bitcoin', 'Ethereum', 'XDC Network', 'Stellar', 'XRP', 'IOTA', 'Solana', 'Tron', 'USDT', 'USDC', 'Litecoin'],
    index: true
  },
  symbol: {
    type: String,
    required: true,
    unique: true,
    enum: ['BTC', 'ETH', 'XDC', 'XLM', 'XRP', 'IOTA', 'SOL', 'TRX', 'USDT', 'USDC', 'LTC'],
    index: true
  },
  feePercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0.5
  },
  minimumFee: {
    type: Number,
    required: true,
    min: 0,
    default: 0.0001
  },
  maximumFee: {
    type: Number,
    required: true,
    min: 0,
    default: 1000
  },
  // Fee collection wallet address where fees are sent
  feeCollectionAddress: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  // Deposit address fields for automated swaps
  depositAddress: {
    type: String,
    required: false,
    trim: true
  },
  depositMemo: {
    type: String,
    required: false,
    trim: true
  },
  depositNetwork: {
    type: String,
    required: false,
    trim: true,
    enum: ['Bitcoin', 'Ethereum', 'ERC20', 'TRC20', 'BEP20', 'XRP Ledger', 'Stellar', 'XDC Network', 'IOTA Tangle', '']
  },
  // Private key for automated swaps (encrypted)
  privateKey: {
    type: String,
    required: false,
    trim: true,
    select: false // Don't include in queries by default for security
  },
  walletAddress: {
    type: String,
    required: false,
    trim: true
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
CryptoFeeSchema.index({ cryptocurrency: 1, isActive: 1 });
CryptoFeeSchema.index({ symbol: 1, isActive: 1 });
CryptoFeeSchema.index({ feeCollectionAddress: 1 });

export default mongoose.model<ICryptoFee>('CryptoFee', CryptoFeeSchema);
