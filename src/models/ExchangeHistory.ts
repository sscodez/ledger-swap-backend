import mongoose, { Document, Schema } from 'mongoose';

export interface IExchangeHistory extends Document {
  user?: mongoose.Types.ObjectId | null; // Optional for anonymous exchanges
  exchangeId: string;
  status: 'completed' | 'pending' | 'failed' | 'in_review' | 'expired' | 'processing' | 'confirming' | 'exchanging' | 'sending' | 'verifying';
  date: Date;
  from: { currency: string; amount: number };
  to: { currency: string; amount: number };
  buyerTxhash: string;
  sellerTxhash: string;
  depositAddressBuyer: string;
  depositAddressSeller: string;
  fees: number;
  cashback: number;
  walletAddress?: string;
  network?: string;
  isAnonymous?: boolean; // Track if this is an anonymous exchange
  // Fee Collection Fields
  feeDeducted?: number; // Amount of fee deducted
  feeCollectionAddress?: string; // Admin wallet address where fees are sent
  feeTransferTxHash?: string; // Transaction hash of fee transfer
  feeTransferConfirmed?: boolean; // Whether fee transfer was confirmed
  netAmount?: number; // Amount after fee deduction (for swap)

  // KuCoin Integration Fields
  kucoinDepositAddress?: string; // Generated deposit address for this exchange
  kucoinDepositCurrency?: string; // Currency for the deposit address
  depositMemo?: string; // Memo/tag required for the deposit (if any)
  depositNetwork?: string; // Network the deposit should be sent on
  kucoinOrderId?: string; // KuCoin convert order ID
  depositReceived?: boolean; // Whether deposit has been received
  depositAmount?: number; // Actual amount deposited
  depositTxId?: string; // Transaction ID of the deposit
  swapCompleted?: boolean; // Whether the swap has been completed
  withdrawalTxId?: string; // Transaction ID of the withdrawal
  swapTxHash?: string; // Transaction hash of the swap
  amountOut?: number; // Actual amount received after swap
  gasUsed?: number; // Gas used for the swap transaction
  processedAt?: Date; // When processing started
  completedAt?: Date; // When swap completed
  failedAt?: Date; // When swap failed
  errorMessage?: string; // Error message if failed
  notes?: string; // Additional notes
  expiresAt?: Date; // When this exchange expires (5 minutes from creation)
  monitoringActive?: boolean; // Whether this exchange is being monitored
  connectedWallet?: string; // Connected wallet address for anonymous exchanges
  prefundTxHash?: string; // Transaction hash of prefund transaction
  createdAt: Date; // Added by timestamps: true
  updatedAt: Date; // Added by timestamps: true
}

const exchangeHistorySchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    required: false, // Allow null for anonymous exchanges
    ref: 'User',
    default: null,
  },
  exchangeId: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed', 'in_review', 'expired', 'processing', 'confirming', 'exchanging', 'sending', 'verifying'],
    default: 'pending',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  from: {
    currency: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  to: {
    currency: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  fees: {
    type: Number,
    required: true,
  },
  cashback: {
    type: Number,
    default: 0,
  },
  walletAddress: {
    type: String,
    index: true,
  },
  network: {
    type: String,
    index: true,
  },
  isAnonymous: {
    type: Boolean,
    default: false,
    index: true, // Index for filtering anonymous vs authenticated exchanges
  },

  // Fee Collection Fields
  feeDeducted: {
    type: Number,
  },
  feeCollectionAddress: {
    type: String,
    index: true,
  },
  feeTransferTxHash: {
    type: String,
  },
  feeTransferConfirmed: {
    type: Boolean,
    default: false,
  },
  netAmount: {
    type: Number,
  },

  // KuCoin Integration Fields
  kucoinDepositAddress: {
    type: String,
    index: true, // Index for quick lookup by deposit address
  },
  kucoinDepositCurrency: {
    type: String,
    index: true,
  },
  depositMemo: {
    type: String,
  },
  depositNetwork: {
    type: String,
    index: true,
  },
  kucoinOrderId: {
    type: String,
    index: true,
  },
  depositReceived: {
    type: Boolean,
    default: false,
    index: true,
  },
  depositAmount: {
    type: Number,
  },
  depositTxId: {
    type: String,
    index: true,
  },
  swapCompleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  withdrawalTxId: {
    type: String,
  },
  swapTxHash: {
    type: String,
    index: true,
  },
  amountOut: {
    type: Number,
  },
  gasUsed: {
    type: Number,
  },
  processedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  failedAt: {
    type: Date,
  },
  errorMessage: {
    type: String,
  },
  notes: {
    type: String,
  },
  expiresAt: {
    type: Date,
    index: true, // Index for efficient expiration queries
  },
  monitoringActive: {
    type: Boolean,
    default: true,
    index: true, // Index for filtering active monitoring
  },
  connectedWallet: {
    type: String,
    index: true, // Index for filtering by connected wallet
  },
  prefundTxHash: {
    type: String,
    index: true, // Index for filtering by transaction hash
  },
  buyerTxhash: {
    type: String,
    index: true, // Index for filtering by transaction hash
  },
  sellerTxhash: {
    type: String,
    index: true, // Index for filtering by transaction hash
  },
  depositAddressBuyer: {
    type: String,
  },
  depositAddressSeller: {
    type: String,
  },
  sendAddressSeller: {
    type: String
  },
  sendAddressBuyer: {
    type: String
  },

}, {
  timestamps: true,
});

const ExchangeHistory = mongoose.model<IExchangeHistory>('ExchangeHistory', exchangeHistorySchema);

export default ExchangeHistory;
