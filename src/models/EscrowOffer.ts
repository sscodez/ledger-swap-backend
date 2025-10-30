import mongoose, { Document, Schema } from 'mongoose';

export interface IEscrowOffer extends Document {
  offerId: string;
  
  // Seller (Creator) Information
  seller: mongoose.Types.ObjectId | null; // User who creates the offer
  sellerChain: 'XRP' | 'XDC' | 'BTC' | 'IOTA' | 'XLM';
  sellerAddress: string;
  sellerAmount: number;
  sellerCurrency: string;
  
  // Buyer Information
  buyer?: mongoose.Types.ObjectId | null; // User who accepts the offer
  buyerChain?: 'XRP' | 'XDC' | 'BTC' | 'IOTA' | 'XLM';
  buyerAddress?: string;
  buyerAmount?: number;
  buyerCurrency?: string;
  
  // Escrow State
  status: 'created' | 'seller_locked' | 'buyer_locked' | 'both_locked' | 'completed' | 'cancelled' | 'disputed' | 'refunded';
  
  // Blockchain References
  sellerEscrowTx?: string; // Transaction hash or escrow sequence
  buyerEscrowTx?: string;
  sellerContractAddress?: string; // For EVM chains
  buyerContractAddress?: string;
  
  // Timing
  expiresAt: Date;
  sellerLockedAt?: Date;
  buyerLockedAt?: Date;
  completedAt?: Date;
  
  // Fee Configuration
  adminFeePercentage: number; // Platform fee (e.g., 2%)
  adminFeeAmount: number; // Calculated fee amount
  adminFeeCollected: boolean;
  adminFeeTxHash?: string;
  
  // Metadata
  description?: string;
  terms?: string;
  isPublic: boolean; // Whether offer is visible to all users
  
  // Dispute Handling
  disputeReason?: string;
  disputeInitiatedBy?: mongoose.Types.ObjectId;
  disputeResolvedBy?: mongoose.Types.ObjectId;
  disputeResolution?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const escrowOfferSchema: Schema = new Schema({
  offerId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  // Seller Information
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
  },
  sellerChain: {
    type: String,
    enum: ['XRP', 'XDC', 'BTC', 'IOTA', 'XLM'],
    required: true,
    index: true,
  },
  sellerAddress: {
    type: String,
    required: true,
    index: true,
  },
  sellerAmount: {
    type: Number,
    required: true,
  },
  sellerCurrency: {
    type: String,
    required: true,
  },
  
  // Buyer Information
  buyer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
  },
  buyerChain: {
    type: String,
    enum: ['XRP', 'XDC', 'BTC', 'IOTA', 'XLM'],
    required: false,
  },
  buyerAddress: {
    type: String,
    required: false,
    index: true,
  },
  buyerAmount: {
    type: Number,
    required: false,
  },
  buyerCurrency: {
    type: String,
    required: false,
  },
  
  // Escrow State
  status: {
    type: String,
    enum: ['created', 'seller_locked', 'buyer_locked', 'both_locked', 'completed', 'cancelled', 'disputed', 'refunded'],
    default: 'created',
    index: true,
  },
  
  // Blockchain References
  sellerEscrowTx: {
    type: String,
    index: true,
  },
  buyerEscrowTx: {
    type: String,
    index: true,
  },
  sellerContractAddress: {
    type: String,
  },
  buyerContractAddress: {
    type: String,
  },
  
  // Timing
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  sellerLockedAt: {
    type: Date,
  },
  buyerLockedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  
  // Fee Configuration
  adminFeePercentage: {
    type: Number,
    required: true,
    default: 2, // 2% default fee
  },
  adminFeeAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  adminFeeCollected: {
    type: Boolean,
    default: false,
  },
  adminFeeTxHash: {
    type: String,
  },
  
  // Metadata
  description: {
    type: String,
    maxlength: 500,
  },
  terms: {
    type: String,
    maxlength: 1000,
  },
  isPublic: {
    type: Boolean,
    default: true,
    index: true,
  },
  
  // Dispute Handling
  disputeReason: {
    type: String,
  },
  disputeInitiatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  disputeResolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  disputeResolution: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
escrowOfferSchema.index({ status: 1, isPublic: 1 });
escrowOfferSchema.index({ seller: 1, status: 1 });
escrowOfferSchema.index({ buyer: 1, status: 1 });
escrowOfferSchema.index({ sellerChain: 1, buyerChain: 1 });
escrowOfferSchema.index({ createdAt: -1 });
escrowOfferSchema.index({ expiresAt: 1, status: 1 });

const EscrowOffer = mongoose.model<IEscrowOffer>('EscrowOffer', escrowOfferSchema);

export default EscrowOffer;
