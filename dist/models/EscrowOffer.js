"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const escrowOfferSchema = new mongoose_1.Schema({
    offerId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    // Seller Information
    seller: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    disputeResolvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const EscrowOffer = mongoose_1.default.model('EscrowOffer', escrowOfferSchema);
exports.default = EscrowOffer;
