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
const CryptoFeeSchema = new mongoose_1.Schema({
    cryptocurrency: {
        type: String,
        required: true,
        unique: true,
        enum: ['Bitcoin', 'Ethereum', 'XDC Network', 'Stellar', 'XRP', 'IOTA', 'Solana', 'Tron', 'USDT', 'USDC', 'Litecoin'],
        index: true
    },
    symbol: {
        type: String,
        required: true,
        unique: true,
        enum: ['BTC', 'ETH', 'XDC', 'XLM', 'XRP', 'IOTA', 'SOL', 'TRX', 'USDT', 'USDC', 'LTC'],
        index: true
    },
    feePercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0.5
    },
    minimumFee: {
        type: Number,
        required: true,
        min: 0,
        default: 0.0001
    },
    maximumFee: {
        type: Number,
        required: true,
        min: 0,
        default: 1000
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    // Deposit address fields for automated swaps
    depositAddress: {
        type: String,
        required: false,
        trim: true
    },
    depositMemo: {
        type: String,
        required: false,
        trim: true
    },
    depositNetwork: {
        type: String,
        required: false,
        trim: true,
        enum: ['Bitcoin', 'Ethereum', 'ERC20', 'TRC20', 'BEP20', 'XRP Ledger', 'Stellar', 'XDC Network', 'IOTA Tangle', '']
    },
    // Private key for automated swaps (encrypted)
    privateKey: {
        type: String,
        required: false,
        trim: true,
        select: false // Don't include in queries by default for security
    },
    walletAddress: {
        type: String,
        required: false,
        trim: true
    }
}, {
    timestamps: true
});
// Create indexes for better query performance
CryptoFeeSchema.index({ cryptocurrency: 1, isActive: 1 });
CryptoFeeSchema.index({ symbol: 1, isActive: 1 });
exports.default = mongoose_1.default.model('CryptoFee', CryptoFeeSchema);
