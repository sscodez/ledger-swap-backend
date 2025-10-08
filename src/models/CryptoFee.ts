import mongoose, { Document, Schema } from 'mongoose';

export interface ICryptoFee extends Document {
  cryptocurrency: string;
  symbol: string;
  feePercentage: number;
  minimumFee: number;
  maximumFee: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CryptoFeeSchema: Schema = new Schema({
  cryptocurrency: {
    type: String,
    required: true,
    unique: true,
    enum: ['Bitcoin', 'XDC Network', 'Stellar', 'XRP', 'IOTA'],
    index: true
  },
  symbol: {
    type: String,
    required: true,
    unique: true,
    enum: ['BTC', 'XDC', 'XLM', 'XRP', 'IOTA'],
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
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
CryptoFeeSchema.index({ cryptocurrency: 1, isActive: 1 });
CryptoFeeSchema.index({ symbol: 1, isActive: 1 });

export default mongoose.model<ICryptoFee>('CryptoFee', CryptoFeeSchema);
