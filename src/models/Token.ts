import mongoose, { Document, Schema } from 'mongoose';

export interface IToken extends Document {
  key: string; // unique token key, e.g., 'usdc-eth'
  symbol: string; // e.g., 'USDC'
  name: string; // e.g., 'USD Coin'
  chainKey: string; // reference to Chain.key
  enabled: boolean;
}

const tokenSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  symbol: { type: String, required: true, index: true },
  name: { type: String, required: true },
  chainKey: { type: String, required: true, index: true },
  enabled: { type: Boolean, default: true, index: true },
}, { timestamps: true });

const Token = mongoose.model<IToken>('Token', tokenSchema);
export default Token;
