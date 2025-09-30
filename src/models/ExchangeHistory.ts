import mongoose, { Document, Schema } from 'mongoose';

export interface IExchangeHistory extends Document {
  user?: mongoose.Types.ObjectId | null; // Optional for anonymous exchanges
  exchangeId: string;
  status: 'completed' | 'pending' | 'failed' | 'in_review';
  date: Date;
  from: { currency: string; amount: number };
  to: { currency: string; amount: number };
  fees: number;
  cashback: number;
  walletAddress?: string;
  network?: string;
  isAnonymous?: boolean; // Track if this is an anonymous exchange
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
    enum: ['completed', 'pending', 'failed', 'in_review'],
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
}, {
  timestamps: true,
});

const ExchangeHistory = mongoose.model<IExchangeHistory>('ExchangeHistory', exchangeHistorySchema);

export default ExchangeHistory;
