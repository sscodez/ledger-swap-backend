import mongoose, { Document, Schema } from 'mongoose';

export interface IExchangeHistory extends Document {
  user?: mongoose.Types.ObjectId | null; // Optional for anonymous exchanges
  exchangeId: string;
  status: 'completed' | 'pending' | 'failed' | 'in_review' | 'expired' | 'processing';
  date: Date;
  from: { currency: string; amount: number };
  to: { currency: string; amount: number };
  fees: number;
  cashback: number;
  walletAddress?: string;
  network?: string;
  isAnonymous?: boolean; // Track if this is an anonymous exchange
  
  // KuCoin Integration Fields
  kucoinDepositAddress?: string; // Generated deposit address for this exchange
  kucoinDepositCurrency?: string; // Currency for the deposit address
  kucoinOrderId?: string; // KuCoin convert order ID
  depositReceived?: boolean; // Whether deposit has been received
  depositAmount?: number; // Actual amount deposited
  depositTxId?: string; // Transaction ID of the deposit
  swapCompleted?: boolean; // Whether the swap has been completed
  withdrawalTxId?: string; // Transaction ID of the withdrawal
  expiresAt?: Date; // When this exchange expires (5 minutes from creation)
  monitoringActive?: boolean; // Whether this exchange is being monitored
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
    enum: ['completed', 'pending', 'failed', 'in_review', 'expired', 'processing'],
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
  
  // KuCoin Integration Fields
  kucoinDepositAddress: {
    type: String,
    index: true, // Index for quick lookup by deposit address
  },
  kucoinDepositCurrency: {
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
  expiresAt: {
    type: Date,
    index: true, // Index for efficient expiration queries
  },
  monitoringActive: {
    type: Boolean,
    default: true,
    index: true, // Index for filtering active monitoring
  },
}, {
  timestamps: true,
});

const ExchangeHistory = mongoose.model<IExchangeHistory>('ExchangeHistory', exchangeHistorySchema);

export default ExchangeHistory;
