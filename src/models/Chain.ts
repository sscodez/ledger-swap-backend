import mongoose, { Document, Schema } from 'mongoose';

export interface IChain extends Document {
  key: string; // e.g., 'ethereum', 'bitcoin'
  name: string; // e.g., 'Ethereum', 'Bitcoin'
  enabled: boolean;
}

const chainSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  enabled: { type: Boolean, default: true, index: true },
}, { timestamps: true });

const Chain = mongoose.model<IChain>('Chain', chainSchema);
export default Chain;
