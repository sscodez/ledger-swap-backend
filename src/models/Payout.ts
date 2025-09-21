import mongoose, { Document, Schema } from 'mongoose';

export interface IPayout extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  status: 'pending' | 'completed' | 'failed';
  payoutAddress: string;
  platform: string;
  fees: number;
}

const payoutSchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  payoutAddress: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    required: true,
  },
  fees: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

const Payout = mongoose.model<IPayout>('Payout', payoutSchema);

export default Payout;
