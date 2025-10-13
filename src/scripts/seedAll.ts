import dotenv from 'dotenv';
import connectDB from '../config/db';
import seedCryptoFees from './seedCryptoFees';
import User from '../models/User';
import Overview from '../models/Overview';
import CryptoFee from '../models/CryptoFee';

// Load environment variables
dotenv.config();

/**
 * Comprehensive seeding script that sets up the entire LedgerSwap database
 * with admin user, test users, and crypto fees data
 */
async function seedAll() {
  console.log('🚀 Starting LedgerSwap Database Seeding...\n');
  
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // 1. Seed Crypto Fees
    console.log('📊 Seeding Crypto Fees...');
    await seedCryptoFees();
    const feesCount = await CryptoFee.countDocuments();
    console.log(`✅ Crypto fees seeded: ${feesCount} currencies\n`);

    // 2. Seed Admin User
    console.log('👤 Seeding Admin User...');
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@ledgerswap.dev';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';
    const adminName = process.env.DEFAULT_ADMIN_NAME || 'Admin';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`⚠️  Admin already exists: ${adminEmail}`);
    } else {
      await User.create({ 
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
      { name: 'Alice Johnson', email: 'alice@example.com', password: 'User@12345', role: 'user' as const },
      { name: 'Bob Smith', email: 'bob@example.com', password: 'User@12345', role: 'user' as const },
      { name: 'Carol Davis', email: 'carol@example.com', password: 'User@12345', role: 'user' as const },
      { name: 'David Wilson', email: 'david@example.com', password: 'User@12345', role: 'user' as const },
      { name: 'Eva Brown', email: 'eva@example.com', password: 'User@12345', role: 'user' as const },
    ];

    let createdUsers = 0;
    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`⚠️  User already exists: ${userData.email}`);
        continue;
      }

      const createdUser = await User.create(userData);
      await Overview.create({ user: createdUser._id });
      console.log(`✅ Created user: ${userData.name} (${userData.email})`);
      createdUsers++;
    }

    console.log(`✅ Test users seeded: ${createdUsers} new users\n`);

    // 4. Display Summary
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalRegularUsers = await User.countDocuments({ role: 'user' });
    const totalOverviews = await Overview.countDocuments();

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
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  }
}

// Run the comprehensive seeding
if (require.main === module) {
  seedAll();
}

export default seedAll;
