import mongoose, { Document, Schema } from 'mongoose';

export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'rejected';

export interface IDisputeMessage {
  senderType: 'user' | 'admin';
  message: string;
  createdAt?: Date;
}

export interface IDispute extends Document {
  user: mongoose.Types.ObjectId;
  exchangeId: string; // relates to ExchangeHistory.exchangeId
  subject: string;
  description: string;
  status: DisputeStatus;
  messages: IDisputeMessage[];
  attachments?: string[];
}

const messageSchema = new Schema<IDisputeMessage>({
  senderType: { type: String, enum: ['user', 'admin'], required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const disputeSchema = new Schema<IDispute>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exchangeId: { type: String, required: true, index: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_review', 'resolved', 'rejected'], default: 'open', index: true },
  messages: { type: [messageSchema], default: [] },
  attachments: { type: [String], default: [] },
}, { timestamps: true });

const Dispute = mongoose.model<IDispute>('Dispute', disputeSchema);
export default Dispute;
