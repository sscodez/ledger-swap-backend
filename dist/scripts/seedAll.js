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
const seedCryptoFees_1 = __importDefault(require("./seedCryptoFees"));
const User_1 = __importDefault(require("../models/User"));
const Overview_1 = __importDefault(require("../models/Overview"));
const CryptoFee_1 = __importDefault(require("../models/CryptoFee"));
// Load environment variables
dotenv_1.default.config();
/**
 * Comprehensive seeding script that sets up the entire LedgerSwap database
 * with admin user, test users, and crypto fees data
 */
function seedAll() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Starting LedgerSwap Database Seeding...\n');
        try {
            // Connect to database
            yield (0, db_1.default)();
            console.log('✅ Connected to MongoDB\n');
            // 1. Seed Crypto Fees
            console.log('📊 Seeding Crypto Fees...');
            yield (0, seedCryptoFees_1.default)();
            const feesCount = yield CryptoFee_1.default.countDocuments();
            console.log(`✅ Crypto fees seeded: ${feesCount} currencies\n`);
            // 2. Seed Admin User
            console.log('👤 Seeding Admin User...');
            const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@ledgerswap.dev';
            const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';
            const adminName = process.env.DEFAULT_ADMIN_NAME || 'Admin';
            const existingAdmin = yield User_1.default.findOne({ email: adminEmail });
            if (existingAdmin) {
                console.log(`⚠️  Admin already exists: ${adminEmail}`);
            }
            else {
                yield User_1.default.create({
                    name: adminName,
                    email: adminEmail,
                    password: adminPassword,
                    role: 'admin'
                });
                console.log('✅ Admin user created successfully');
                console.log('===============================');
                console.log(`📧 Email: ${adminEmail}`);
                console.log(`🔑 Password: ${adminPassword}`);
                console.log('===============================\n');
            }
            // 3. Seed Test Users
            console.log('👥 Seeding Test Users...');
            const testUsers = [
                { name: 'Alice Johnson', email: 'alice@example.com', password: 'User@12345', role: 'user' },
                { name: 'Bob Smith', email: 'bob@example.com', password: 'User@12345', role: 'user' },
                { name: 'Carol Davis', email: 'carol@example.com', password: 'User@12345', role: 'user' },
                { name: 'David Wilson', email: 'david@example.com', password: 'User@12345', role: 'user' },
                { name: 'Eva Brown', email: 'eva@example.com', password: 'User@12345', role: 'user' },
            ];
            let createdUsers = 0;
            for (const userData of testUsers) {
                const existingUser = yield User_1.default.findOne({ email: userData.email });
                if (existingUser) {
                    console.log(`⚠️  User already exists: ${userData.email}`);
                    continue;
                }
                const createdUser = yield User_1.default.create(userData);
                yield Overview_1.default.create({ user: createdUser._id });
                console.log(`✅ Created user: ${userData.name} (${userData.email})`);
                createdUsers++;
            }
            console.log(`✅ Test users seeded: ${createdUsers} new users\n`);
            // 4. Display Summary
            const totalUsers = yield User_1.default.countDocuments();
            const totalAdmins = yield User_1.default.countDocuments({ role: 'admin' });
            const totalRegularUsers = yield User_1.default.countDocuments({ role: 'user' });
            const totalOverviews = yield Overview_1.default.countDocuments();
            console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!\n');
            console.log('📈 SUMMARY:');
            console.log('===============================');
            console.log(`👤 Total Users: ${totalUsers}`);
            console.log(`🔑 Admin Users: ${totalAdmins}`);
            console.log(`👥 Regular Users: ${totalRegularUsers}`);
            console.log(`📊 User Overviews: ${totalOverviews}`);
            console.log(`💰 Crypto Fees: ${feesCount}`);
            console.log('===============================\n');
            console.log('🚀 LedgerSwap is ready for development!');
            console.log('🌐 Admin Panel: https://ledgerswap.io/admin');
            console.log('💱 Exchange: https://ledgerswap.io/exchange\n');
            process.exit(0);
        }
        catch (error) {
            console.error('❌ Error during database seeding:', error);
            process.exit(1);
        }
    });
}
// Run the comprehensive seeding
if (require.main === module) {
    seedAll();
}
exports.default = seedAll;
