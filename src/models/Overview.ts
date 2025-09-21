import mongoose, { Document, Schema } from 'mongoose';

export interface IOverview extends Document {
  user: mongoose.Types.ObjectId;
  accountBalance: number;
  transactionVolume90days: number;
  currentTransactionFee: number;
}

const overviewSchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    unique: true,
  },
  accountBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  transactionVolume90days: {
    type: Number,
    required: true,
    default: 0,
  },
  currentTransactionFee: {
    type: Number,
    required: true,
    default: 0.01, // Example default fee
  },
}, {
  timestamps: true,
});

const Overview = mongoose.model<IOverview>('Overview', overviewSchema);

export default Overview;
