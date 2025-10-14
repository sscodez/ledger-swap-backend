"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const CryptoFee_1 = __importDefault(require("../models/CryptoFee"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DEPOSIT_ADDRESS = '0xda791a424b294a594D81b09A86531CB1Dcf6b932';
// Focus on your primary trading tokens: XRP, XLM, XDC, IOTA
const cryptoConfigurations = [
    {
        cryptocurrency: 'XRP',
        symbol: 'XRP',
        feePercentage: 0.5,
        minimumFee: 1,
        maximumFee: 10000,
        isActive: true,
        depositAddress: DEPOSIT_ADDRESS,
        depositNetwork: 'Ethereum', // Wrapped XRP on Ethereum
        walletAddress: DEPOSIT_ADDRESS,
        tokenAddress: '0x1d2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
        isWrapped: true
    },
    {
        cryptocurrency: 'Stellar',
        symbol: 'XLM',
        feePercentage: 0.5,
        minimumFee: 1,
        maximumFee: 10000,
        isActive: true,
        depositAddress: DEPOSIT_ADDRESS,
        depositNetwork: 'Ethereum', // Wrapped XLM on Ethereum
        walletAddress: DEPOSIT_ADDRESS,
        tokenAddress: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942',
        isWrapped: true
    },
    {
        cryptocurrency: 'XDC Network',
        symbol: 'XDC',
        feePercentage: 0.5,
        minimumFee: 1,
        maximumFee: 10000,
        isActive: true,
        depositAddress: DEPOSIT_ADDRESS,
        depositNetwork: 'Ethereum', // Wrapped XDC on Ethereum
        walletAddress: DEPOSIT_ADDRESS,
        tokenAddress: '0x41AB1b6fcbB2fA9DCEd81aCbdeC13Ea6315F2Bf2',
        isWrapped: true
    },
    {
        cryptocurrency: 'IOTA',
        symbol: 'IOTA',
        feePercentage: 0.5,
        minimumFee: 1,
        maximumFee: 10000,
        isActive: true,
        depositAddress: DEPOSIT_ADDRESS,
        depositNetwork: 'BSC', // IOTA on BSC
        walletAddress: DEPOSIT_ADDRESS,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        isWrapped: false
    },
    // Add ETH and USDT for trading pairs
    {
        cryptocurrency: 'Ethereum',
        symbol: 'ETH',
        feePercentage: 0.5,
        minimumFee: 0.001,
        maximumFee: 1000,
        isActive: true,
        depositAddress: DEPOSIT_ADDRESS,
        depositNetwork: 'Ethereum',
        walletAddress: DEPOSIT_ADDRESS,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        isWrapped: false
    },
    {
        cryptocurrency: 'USDT',
        symbol: 'USDT',
        feePercentage: 0.5,
        minimumFee: 1,
        maximumFee: 10000,
        isActive: true,
        depositAddress: DEPOSIT_ADDRESS,
        depositNetwork: 'ERC20',
        walletAddress: DEPOSIT_ADDRESS,
        tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        isWrapped: false
    }
];
function setupDepositAddresses() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Connect to MongoDB
            const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ledgerswap';
            yield mongoose_1.default.connect(MONGODB_URI);
            console.log('✅ Connected to MongoDB');
            console.log(`🔧 Setting up deposit addresses with: ${DEPOSIT_ADDRESS}`);
            for (const config of cryptoConfigurations) {
                try {
                    // Use upsert to create or update
                    const result = yield CryptoFee_1.default.findOneAndUpdate({ symbol: config.symbol }, config, {
                        upsert: true,
                        new: true,
                        setDefaultsOnInsert: true
                    });
                    console.log(`✅ ${config.symbol} (${config.cryptocurrency}) configured:`);
                    console.log(`   - Deposit Address: ${result.depositAddress}`);
                    console.log(`   - Network: ${result.depositNetwork}`);
                    console.log(`   - Fee: ${result.feePercentage}%`);
                    console.log(`   - Active: ${result.isActive}`);
                    console.log('');
                }
                catch (error) {
                    console.error(`❌ Error configuring ${config.symbol}:`, error.message);
                }
            }
            console.log('🎉 Deposit address setup completed!');
            console.log('📍 All currencies now use the master deposit address for monitoring');
            console.log('🔄 Exchange creation will now generate deposit addresses automatically');
        }
        catch (error) {
            console.error('❌ Setup failed:', error.message);
        }
        finally {
            yield mongoose_1.default.disconnect();
            console.log('🔌 Disconnected from MongoDB');
        }
    });
}
// Run the setup
setupDepositAddresses();
