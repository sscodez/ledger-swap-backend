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
const exchangeHistorySchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: false, // Allow null for anonymous exchanges
        ref: 'User',
        default: null,
    },
    exchangeId: {
        type: String,
        required: true,
        unique: true,
    },
    status: {
        type: String,
        enum: ['completed', 'pending', 'failed', 'in_review', 'expired', 'processing'],
        default: 'pending',
    },
    date: {
        type: Date,
        default: Date.now,
    },
    from: {
        currency: { type: String, required: true },
        amount: { type: Number, required: true },
    },
    to: {
        currency: { type: String, required: true },
        amount: { type: Number, required: true },
    },
    fees: {
        type: Number,
        required: true,
    },
    cashback: {
        type: Number,
        default: 0,
    },
    walletAddress: {
        type: String,
        index: true,
    },
    network: {
        type: String,
        index: true,
    },
    isAnonymous: {
        type: Boolean,
        default: false,
        index: true, // Index for filtering anonymous vs authenticated exchanges
    },
    // KuCoin Integration Fields
    kucoinDepositAddress: {
        type: String,
        index: true, // Index for quick lookup by deposit address
    },
    kucoinDepositCurrency: {
        type: String,
        index: true,
    },
    kucoinOrderId: {
        type: String,
        index: true,
    },
    depositReceived: {
        type: Boolean,
        default: false,
        index: true,
    },
    depositAmount: {
        type: Number,
    },
    depositTxId: {
        type: String,
        index: true,
    },
    swapCompleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    withdrawalTxId: {
        type: String,
    },
    expiresAt: {
        type: Date,
        index: true, // Index for efficient expiration queries
    },
    monitoringActive: {
        type: Boolean,
        default: true,
        index: true, // Index for filtering active monitoring
    },
}, {
    timestamps: true,
});
const ExchangeHistory = mongoose_1.default.model('ExchangeHistory', exchangeHistorySchema);
exports.default = ExchangeHistory;
