import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupportMessage extends Document {
  subject: string;
  message: string;
  fromEmail?: string;
  toEmail: string;
  status: 'sent' | 'accepted' | 'failed';
  error?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    subject: { type: String, required: true },
    message: { type: String, required: true },
    fromEmail: { type: String },
    toEmail: { type: String, required: true },
    status: { type: String, enum: ['sent', 'accepted', 'failed'], required: true, default: 'accepted' },
    error: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const SupportMessage: Model<ISupportMessage> = mongoose.models.SupportMessage || mongoose.model<ISupportMessage>('SupportMessage', SupportMessageSchema);

export default SupportMessage;
