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
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("../config/db"));
const CryptoFee_1 = __importDefault(require("../models/CryptoFee"));
dotenv_1.default.config();
const cryptoFeesData = [
    {
        cryptocurrency: 'Bitcoin',
        symbol: 'BTC',
        feePercentage: 0.5,
        minimumFee: 0.0001,
        maximumFee: 0.01,
        isActive: true
    },
    {
        cryptocurrency: 'XDC Network',
        symbol: 'XDC',
        feePercentage: 0.3,
        minimumFee: 1,
        maximumFee: 1000,
        isActive: true
    },
    {
        cryptocurrency: 'Stellar',
        symbol: 'XLM',
        feePercentage: 0.4,
        minimumFee: 0.1,
        maximumFee: 500,
        isActive: true
    },
    {
        cryptocurrency: 'XRP',
        symbol: 'XRP',
        feePercentage: 0.4,
        minimumFee: 0.1,
        maximumFee: 500,
        isActive: true
    },
    {
        cryptocurrency: 'IOTA',
        symbol: 'IOTA',
        feePercentage: 0.2,
        minimumFee: 0.01,
        maximumFee: 100,
        isActive: true
    }
];
function seedCryptoFees() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Connect to MongoDB
            yield (0, db_1.default)();
            console.log('Connected to MongoDB');
            // Clear existing crypto fees
            yield CryptoFee_1.default.deleteMany({});
            console.log('Cleared existing crypto fees');
            // Insert new crypto fees
            const createdFees = yield CryptoFee_1.default.insertMany(cryptoFeesData);
            console.log(`Created ${createdFees.length} crypto fees:`);
            createdFees.forEach(fee => {
                console.log(`- ${fee.cryptocurrency} (${fee.symbol}): ${fee.feePercentage}% fee`);
            });
            console.log('\n✅ Crypto fees seeded successfully!');
        }
        catch (error) {
            console.error('❌ Error seeding crypto fees:', error);
            throw error; // Re-throw for seedAll.ts to handle
        }
    });
}
// Run the seed function
if (require.main === module) {
    seedCryptoFees();
}
exports.default = seedCryptoFees;
