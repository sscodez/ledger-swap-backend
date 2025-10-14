import mongoose from 'mongoose';
import CryptoFee from '../models/CryptoFee';
import dotenv from 'dotenv';

dotenv.config();

const DEPOSIT_ADDRESS = '0xda791a424b294a594D81b09A86531CB1Dcf6b932';

const cryptoConfigurations = [
  {
    cryptocurrency: 'Ethereum',
    symbol: 'ETH',
    feePercentage: 0.5,
    minimumFee: 0.001,
    maximumFee: 1000,
    isActive: true,
    depositAddress: DEPOSIT_ADDRESS,
    depositNetwork: 'Ethereum',
    walletAddress: DEPOSIT_ADDRESS
  },
  {
    cryptocurrency: 'Bitcoin',
    symbol: 'BTC',
    feePercentage: 0.5,
    minimumFee: 0.00001,
    maximumFee: 1000,
    isActive: true,
    depositAddress: DEPOSIT_ADDRESS, // Will be converted to BTC format in production
    depositNetwork: 'Bitcoin',
    walletAddress: DEPOSIT_ADDRESS
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
    walletAddress: DEPOSIT_ADDRESS
  },
  {
    cryptocurrency: 'USDC',
    symbol: 'USDC',
    feePercentage: 0.5,
    minimumFee: 1,
    maximumFee: 10000,
    isActive: true,
    depositAddress: DEPOSIT_ADDRESS,
    depositNetwork: 'ERC20',
    walletAddress: DEPOSIT_ADDRESS
  },
  {
    cryptocurrency: 'XRP',
    symbol: 'XRP',
    feePercentage: 0.5,
    minimumFee: 0.1,
    maximumFee: 10000,
    isActive: true,
    depositAddress: DEPOSIT_ADDRESS, // Will need XRP address in production
    depositNetwork: 'XRP Ledger',
    walletAddress: DEPOSIT_ADDRESS
  },
  {
    cryptocurrency: 'Stellar',
    symbol: 'XLM',
    feePercentage: 0.5,
    minimumFee: 0.1,
    maximumFee: 10000,
    isActive: true,
    depositAddress: DEPOSIT_ADDRESS, // Will need Stellar address in production
    depositNetwork: 'Stellar',
    walletAddress: DEPOSIT_ADDRESS
  },
  {
    cryptocurrency: 'XDC Network',
    symbol: 'XDC',
    feePercentage: 0.5,
    minimumFee: 1,
    maximumFee: 10000,
    isActive: true,
    depositAddress: DEPOSIT_ADDRESS,
    depositNetwork: 'XDC Network',
    walletAddress: DEPOSIT_ADDRESS
  },
  {
    cryptocurrency: 'IOTA',
    symbol: 'IOTA',
    feePercentage: 0.5,
    minimumFee: 1,
    maximumFee: 10000,
    isActive: true,
    depositAddress: DEPOSIT_ADDRESS, // Will need IOTA address in production
    depositNetwork: 'IOTA Tangle',
    walletAddress: DEPOSIT_ADDRESS
  }
];

async function setupDepositAddresses() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ledgerswap';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log(`🔧 Setting up deposit addresses with: ${DEPOSIT_ADDRESS}`);

    for (const config of cryptoConfigurations) {
      try {
        // Use upsert to create or update
        const result = await CryptoFee.findOneAndUpdate(
          { symbol: config.symbol },
          config,
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true
          }
        );

        console.log(`✅ ${config.symbol} (${config.cryptocurrency}) configured:`);
        console.log(`   - Deposit Address: ${result.depositAddress}`);
        console.log(`   - Network: ${result.depositNetwork}`);
        console.log(`   - Fee: ${result.feePercentage}%`);
        console.log(`   - Active: ${result.isActive}`);
        console.log('');
      } catch (error: any) {
        console.error(`❌ Error configuring ${config.symbol}:`, error.message);
      }
    }

    console.log('🎉 Deposit address setup completed!');
    console.log('📍 All currencies now use the master deposit address for monitoring');
    console.log('🔄 Exchange creation will now generate deposit addresses automatically');

  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the setup
setupDepositAddresses();
