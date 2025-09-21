import mongoose, { Document, Schema } from 'mongoose';

export interface IAddress extends Document {
  user: mongoose.Types.ObjectId;
  coin: string;
  network: string;
  label: string;
  address: string;
  flagged?: boolean;
  flaggedReason?: string;
  flaggedAt?: Date;
}

const addressSchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  coin: {
    type: String,
    required: true,
  },
  network: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
    unique: true,
  },
  flagged: {
    type: Boolean,
    default: false,
    index: true,
  },
  flaggedReason: {
    type: String,
  },
  flaggedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

const Address = mongoose.model<IAddress>('Address', addressSchema);

export default Address;
