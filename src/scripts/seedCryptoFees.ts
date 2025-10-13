import dotenv from 'dotenv';
import connectDB from '../config/db';
import CryptoFee from '../models/CryptoFee';

dotenv.config();

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

async function seedCryptoFees() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing crypto fees
    await CryptoFee.deleteMany({});
    console.log('Cleared existing crypto fees');

    // Insert new crypto fees
    const createdFees = await CryptoFee.insertMany(cryptoFeesData);
    console.log(`Created ${createdFees.length} crypto fees:`);
    
    createdFees.forEach(fee => {
      console.log(`- ${fee.cryptocurrency} (${fee.symbol}): ${fee.feePercentage}% fee`);
    });

    console.log('\n✅ Crypto fees seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding crypto fees:', error);
    throw error; // Re-throw for seedAll.ts to handle
  }
}

// Run the seed function
if (require.main === module) {
  seedCryptoFees();
}

export default seedCryptoFees;
