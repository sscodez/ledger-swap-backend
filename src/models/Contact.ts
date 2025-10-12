import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: 'general' | 'technical' | 'trading' | 'security' | 'billing' | 'partnership';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: mongoose.Types.ObjectId; // Admin user
  disputeId?: mongoose.Types.ObjectId; // Link to dispute if escalated
  isDispute: boolean; // Flag to indicate if this should be treated as a dispute
  responses?: {
    message: string;
    respondedBy: mongoose.Types.ObjectId;
    respondedAt: Date;
  }[];
  createdAt: Date; // Added by timestamps: true
  updatedAt: Date; // Added by timestamps: true
}

const contactSchema = new Schema<IContact>({
  name: { type: String, required: true },
  email: { type: String, required: true, index: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['general', 'technical', 'trading', 'security', 'billing', 'partnership'],
    default: 'general',
    index: true
  },
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    index: true
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  disputeId: { type: Schema.Types.ObjectId, ref: 'Dispute' },
  isDispute: { type: Boolean, default: false, index: true },
  responses: [{
    message: { type: String, required: true },
    respondedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    respondedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const Contact = mongoose.model<IContact>('Contact', contactSchema);
export default Contact;
