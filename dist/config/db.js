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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Debug mongoose version and setup
console.log('Mongoose version:', mongoose_1.default.version);
console.log('Node.js version:', process.version);
// Set mongoose options globally to avoid constructor issues
mongoose_1.default.set('strictQuery', false);
function tryConnect(mongoURI) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Attempting to connect to MongoDB...');
        console.log('URI (masked):', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
        // Disconnect any existing connection first
        if (mongoose_1.default.connection.readyState !== 0) {
            yield mongoose_1.default.disconnect();
        }
        // Use the most basic connection possible to avoid constructor issues
        const connection = yield mongoose_1.default.connect(mongoURI);
        return connection;
    });
}
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    const mongoURI = 'mongodb+srv://ssameershah1200:fsuheocdNSHmLZjJ@cluster0.klfmnwd.mongodb.net/ledgerswap';
    if (!mongoURI || mongoURI.trim() === '') {
        console.error('MONGO_URI not found or empty in .env file');
        console.error('Please set MONGO_URI in your .env file to a valid MongoDB connection string');
        console.error('Example: MONGO_URI=mongodb://localhost:27017/ledgerswap');
        console.error('Or for MongoDB Atlas: MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ledgerswap');
        process.exit(1);
    }
    const maxRetries = 5;
    let attempt = 0;
    while (attempt < maxRetries) {
        attempt += 1;
        try {
            yield tryConnect(mongoURI);
            console.log('MongoDB connected');
            return;
        }
        catch (error) {
            const code = (error === null || error === void 0 ? void 0 : error.code) || (error === null || error === void 0 ? void 0 : error.name);
            const msg = (error === null || error === void 0 ? void 0 : error.message) || String(error);
            console.error(`MongoDB connection attempt ${attempt} failed (${code}): ${msg}`);
            // Common guidance for SRV/DNS timeouts
            if ((msg === null || msg === void 0 ? void 0 : msg.includes('queryTxt')) || (msg === null || msg === void 0 ? void 0 : msg.includes('ETIMEOUT'))) {
                console.error('Hint: If you are using mongodb+srv, ensure network allows DNS (TXT/SRV) lookups and your Atlas IP Access List includes your IP.\n' +
                    '      Alternatively, use a standard mongodb:// connection string with hosts/replicas instead of SRV.');
            }
            if (attempt >= maxRetries) {
                console.error('Exceeded max retries. Exiting.');
                process.exit(1);
            }
            // Backoff before next attempt
            const backoffMs = Math.min(15000, 1000 * attempt);
            yield new Promise((res) => setTimeout(res, backoffMs));
        }
    }
});
exports.default = connectDB;
