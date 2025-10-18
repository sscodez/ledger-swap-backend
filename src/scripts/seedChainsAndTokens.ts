/**
 * Database Seeder for Chains and Tokens
 * Seeds BTC, XLM, XRP, XDC, and MIOTA chains with their native tokens and popular assets
 */

import mongoose from 'mongoose';
import Chain from '../models/Chain';
import Token from '../models/Token';
import dotenv from 'dotenv';

dotenv.config();

const CHAINS_DATA = [
  // Bitcoin
  {
    key: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    chainType: 'utxo',
    rpcEndpoints: [
      'https://blockstream.info/api',
      'https://blockchain.info',
      'https://btc.getblock.io/mainnet'
    ],
    explorerUrl: 'https://blockstream.info',
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 8
    },
    confirmationsRequired: 3,
    enabled: true,
    supportsSmartContracts: false,
    supportsTokens: false,
    averageBlockTime: 600,
    networkFee: {
      low: '0.00002',
      medium: '0.00005',
      high: '0.0001'
    }
  },
  
  // Stellar
  {
    key: 'stellar',
    name: 'Stellar',
    symbol: 'XLM',
    chainType: 'account',
    rpcEndpoints: [
      'https://horizon.stellar.org',
      'https://horizon.publicnode.org'
    ],
    explorerUrl: 'https://stellarchain.io',
    nativeCurrency: {
      name: 'Stellar Lumens',
      symbol: 'XLM',
      decimals: 7
    },
    confirmationsRequired: 1,
    enabled: true,
    supportsSmartContracts: true,
    supportsTokens: true,
    averageBlockTime: 5,
    networkFee: {
      low: '0.00001',
      medium: '0.00001',
      high: '0.00002'
    }
  },
  
  // XRP Ledger
  {
    key: 'xrp-ledger',
    name: 'XRP Ledger',
    symbol: 'XRP',
    chainType: 'account',
    rpcEndpoints: [
      'https://s1.ripple.com:51234',
      'https://s2.ripple.com:51234',
      'https://xrplcluster.com'
    ],
    explorerUrl: 'https://livenet.xrpl.org',
    nativeCurrency: {
      name: 'Ripple',
      symbol: 'XRP',
      decimals: 6
    },
    confirmationsRequired: 1,
    enabled: true,
    supportsSmartContracts: false,
    supportsTokens: true,
    averageBlockTime: 4,
    networkFee: {
      low: '0.00001',
      medium: '0.00001',
      high: '0.00002'
    }
  },
  
  // XDC Network
  {
    key: 'xdc-network',
    name: 'XDC Network',
    symbol: 'XDC',
    chainType: 'evm',
    chainId: 50,
    rpcEndpoints: [
      'https://rpc.xinfin.network',
      'https://erpc.xinfin.network',
      'https://rpc.xinfin.yodaplus.net'
    ],
    explorerUrl: 'https://explorer.xinfin.network',
    nativeCurrency: {
      name: 'XinFin',
      symbol: 'XDC',
      decimals: 18
    },
    confirmationsRequired: 2,
    enabled: true,
    supportsSmartContracts: true,
    supportsTokens: true,
    averageBlockTime: 2,
    networkFee: {
      low: '0.00001',
      medium: '0.00002',
      high: '0.00005'
    }
  },
  
  // IOTA
  {
    key: 'iota',
    name: 'IOTA',
    symbol: 'MIOTA',
    chainType: 'dag',
    rpcEndpoints: [
      'https://api.shimmer.network',
      'https://chrysalis-nodes.iota.org'
    ],
    explorerUrl: 'https://explorer.iota.org',
    nativeCurrency: {
      name: 'IOTA',
      symbol: 'MIOTA',
      decimals: 6
    },
    confirmationsRequired: 1,
    enabled: true,
    supportsSmartContracts: false,
    supportsTokens: true,
    averageBlockTime: 10,
    networkFee: {
      low: '0',
      medium: '0',
      high: '0'
    }
  }
];

const TOKENS_DATA = [
  // Bitcoin native
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    chainKey: 'bitcoin',
    tokenType: 'native',
    decimals: 8,
    coingeckoId: 'bitcoin',
    minSwapAmount: '0.0001',
    maxSwapAmount: '100',
    enabled: true,
    isStablecoin: false,
    liquidityScore: 100
  },
  
  // Stellar native and tokens
  {
    symbol: 'XLM',
    name: 'Stellar Lumens',
    chainKey: 'stellar',
    tokenType: 'native',
    decimals: 7,
    coingeckoId: 'stellar',
    minSwapAmount: '1',
    maxSwapAmount: '1000000',
    enabled: true,
    isStablecoin: false,
    liquidityScore: 95
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    chainKey: 'stellar',
    tokenType: 'stellar-asset',
    contractAddress: 'USDC',
    issuerAddress: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    decimals: 7,
    coingeckoId: 'usd-coin',
    minSwapAmount: '1',
    maxSwapAmount: '1000000',
    enabled: true,
    isStablecoin: true,
    liquidityScore: 90
  },
  
  // XRP native and trustlines
  {
    symbol: 'XRP',
    name: 'Ripple',
    chainKey: 'xrp-ledger',
    tokenType: 'native',
    decimals: 6,
    coingeckoId: 'ripple',
    minSwapAmount: '10',
    maxSwapAmount: '1000000',
    enabled: true,
    isStablecoin: false,
    liquidityScore: 98
  },
  {
    symbol: 'USD',
    name: 'Bitstamp USD',
    chainKey: 'xrp-ledger',
    tokenType: 'xrp-trustline',
    contractAddress: 'USD',
    issuerAddress: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
    decimals: 6,
    coingeckoId: 'tether',
    minSwapAmount: '1',
    maxSwapAmount: '1000000',
    enabled: true,
    isStablecoin: true,
    liquidityScore: 85
  },
  
  // XDC native and XRC20 tokens
  {
    symbol: 'XDC',
    name: 'XinFin',
    chainKey: 'xdc-network',
    tokenType: 'native',
    decimals: 18,
    coingeckoId: 'xdce-crowd-sale',
    minSwapAmount: '1',
    maxSwapAmount: '1000000',
    enabled: true,
    isStablecoin: false,
    liquidityScore: 92
  },
  {
    symbol: 'WXDC',
    name: 'Wrapped XDC',
    chainKey: 'xdc-network',
    tokenType: 'xrc20',
    contractAddress: 'xdc951857744785e80e2de051c32ee7b25f9c458c42',
    decimals: 18,
    minSwapAmount: '1',
    maxSwapAmount: '1000000',
    enabled: true,
    isStablecoin: false,
    liquidityScore: 88
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    chainKey: 'xdc-network',
    tokenType: 'xrc20',
    contractAddress: 'xdcaeee5f88b989bfebfee39ce3edfb6e8ab3b49d13',
    decimals: 6,
    coingeckoId: 'tether',
    minSwapAmount: '1',
    maxSwapAmount: '1000000',
    enabled: true,
    isStablecoin: true,
    liquidityScore: 90
  },
  
  // IOTA native
  {
    symbol: 'MIOTA',
    name: 'IOTA',
    chainKey: 'iota',
    tokenType: 'native',
    decimals: 6,
    coingeckoId: 'iota',
    minSwapAmount: '1',
    maxSwapAmount: '1000000',
    enabled: true,
    isStablecoin: false,
    liquidityScore: 87
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ledgerswap';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing chains and tokens...');
    await Chain.deleteMany({});
    await Token.deleteMany({});

    // Seed chains
    console.log('🌐 Seeding chains...');
    const chains = await Chain.insertMany(CHAINS_DATA);
    console.log(`✅ Created ${chains.length} chains: ${chains.map(c => c.name).join(', ')}`);

    // Generate token keys and seed tokens
    console.log('💎 Seeding tokens...');
    const tokensWithKeys = TOKENS_DATA.map(token => ({
      ...token,
      key: `${token.symbol.toLowerCase()}-${token.chainKey}`
    }));
    
    const tokens = await Token.insertMany(tokensWithKeys);
    console.log(`✅ Created ${tokens.length} tokens`);

    // Display summary
    console.log('\n📊 Seeding Summary:');
    console.log('=' .repeat(50));
    
    for (const chain of chains) {
      const chainTokens = tokens.filter(t => t.chainKey === chain.key);
      console.log(`\n🔗 ${chain.name} (${chain.symbol})`);
      console.log(`   Type: ${chain.chainType.toUpperCase()}`);
      console.log(`   Tokens: ${chainTokens.length}`);
      chainTokens.forEach(t => {
        console.log(`     - ${t.symbol}: ${t.name} ${t.isStablecoin ? '(Stablecoin)' : ''}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Database seeded successfully!');
    console.log('\n📌 Next steps:');
    console.log('   1. Start your backend server');
    console.log('   2. Access admin panel to manage chains/tokens');
    console.log('   3. Configure RPC endpoints in .env file');
    console.log('   4. Test multi-chain swaps\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run seeder
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedDatabase;
