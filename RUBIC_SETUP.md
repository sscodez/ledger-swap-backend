# Rubic SDK Integration Guide

## Overview

The LedgerSwap backend integrates **Rubic SDK v5.57.4** for professional DEX aggregation and trade execution. This guide covers proper setup according to the [official Rubic SDK documentation](https://www.npmjs.com/package/rubic-sdk).

## Installation

The Rubic SDK is already installed via npm:

```bash
npm install rubic-sdk@^5.57.4 ethers@^6.8.0
```

## Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# Rubic SDK Configuration
RUBIC_CROSS_CHAIN_FEE_ADDRESS=0x0000000000000000000000000000000000000000
RUBIC_ON_CHAIN_FEE_ADDRESS=0x0000000000000000000000000000000000000000

# RPC Endpoints (REQUIRED)
INFURA_ETHEREUM_RPC=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
INFURA_BSC_RPC=https://bsc-dataseed.binance.org/
INFURA_POLYGON_RPC=https://polygon-rpc.com/
INFURA_ARBITRUM_RPC=https://arb1.arbitrum.io/rpc

# Wallet for Swap Execution (OPTIONAL - enables real trades)
SWAP_WALLET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
SWAP_WALLET_ADDRESS=0x0000000000000000000000000000000000000000
```

### 2. SDK Initialization

The SDK is initialized automatically when the `RubicTradingEngine` is instantiated:

```typescript
const sdk = await SDK.createSDK({
  rpcProviders: {
    [BLOCKCHAIN_NAME.ETHEREUM]: {
      rpcList: ['https://mainnet.infura.io/v3/YOUR_PROJECT_ID']
    },
    [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: {
      rpcList: ['https://bsc-dataseed.binance.org/']
    },
    // Add more chains as needed
  },
  providerAddress: {
    [CHAIN_TYPE.EVM]: {
      crossChain: '0x0000000000000000000000000000000000000000',
      onChain: '0x0000000000000000000000000000000000000000'
    }
  }
});
```

### 3. Wallet Provider Setup

For **real trade execution**, configure a wallet with the SDK:

```typescript
// Wallet is initialized automatically from SWAP_WALLET_PRIVATE_KEY
const walletProvider: WalletProvider = {
  [CHAIN_TYPE.EVM]: {
    address: '0x123...', // Wallet address
    core: new ethers.Wallet(privateKey, provider) // ethers.js wallet
  }
};

// Update SDK with wallet provider
sdk.updateWalletAddress(CHAIN_TYPE.EVM, address);
```

## Trade Execution Flow

### 1. Calculate Trade

```typescript
// On-chain trade (same blockchain)
const trades = await sdk.onChainManager.calculateTrade(
  { blockchain: BLOCKCHAIN_NAME.ETHEREUM, address: '0x...' }, // from token
  1, // amount
  '0x...' // to token address
);

// Cross-chain trade (different blockchains)
const wrappedTrades = await sdk.crossChainManager.calculateTrade(
  { blockchain: BLOCKCHAIN_NAME.ETHEREUM, address: '0x...' },
  1,
  { blockchain: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN, address: '0x...' }
);
```

### 2. Execute Swap

```typescript
const trade = trades[0]; // Best trade from quote

// Execute with confirmation callback
const onConfirm = (hash: string) => {
  console.log(`Transaction confirmed: ${hash}`);
};

const receipt = await trade.swap({ onConfirm });
const txHash = receipt; // Transaction hash string
```

## Implementation Details

### Trade Caching

The `RubicTradingEngine` caches trade instances for 5 minutes:

```typescript
// Cache trade after quote calculation
const tradeId = `${fromToken}-${toToken}-${amount}-${Date.now()}`;
this.tradeCache.set(tradeId, {
  trade: bestTrade,
  timestamp: Date.now()
});
```

This allows you to execute the exact trade that was quoted to the user.

### Execution Modes

The system supports two execution modes:

#### 1. **Real Execution** (with wallet configured)
- Uses actual Rubic SDK trade execution
- Requires `SWAP_WALLET_PRIVATE_KEY` in environment
- Executes real blockchain transactions
- Returns actual transaction hashes

#### 2. **Simulated Execution** (without wallet)
- Falls back to mock execution
- Used for testing/development
- Simulates processing time
- Returns simulated transaction hashes

### Supported Blockchains

- **Ethereum** (ETH, WBTC, USDT, USDC)
- **Binance Smart Chain** (BNB, BUSD)
- **Polygon** (MATIC, wrapped tokens)
- **Arbitrum** (ARB, L2 tokens)

### Token Mappings

LedgerSwap Phase 1 currencies are mapped to wrapped tokens:

```typescript
'BTC'   → WBTC on Ethereum (0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599)
'XRP'   → Wrapped XRP on Ethereum (0x1d2F0da169ceB9fC7B3144628dB156f3F6c60dBE)
'XLM'   → Wrapped XLM on Ethereum (0x0F5D2fB29fb7d3CFeE444a200298f468908cC942)
'XDC'   → XDC on Ethereum (0x41AB1b6fcbB2fA9DCEd81aCbdeC13Ea6315F2Bf2)
'MIOTA' → IOTA on BSC (0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a)
```

## API Endpoints

### Get Quote
```
POST /api/trading/quote
{
  "fromToken": "XRP",
  "toToken": "BTC",
  "amount": "100"
}
```

### Execute Swap
```
POST /api/trading/execute
{
  "exchangeId": "abc123",
  "quote": { ... }
}
```

### Health Check
```
GET /api/trading/health
```

## Security Considerations

### 1. Private Key Management
- **Never commit** private keys to version control
- Store in environment variables only
- Use hardware wallets or KMS in production
- Rotate keys regularly

### 2. Gas Management
- Ensure swap wallet has sufficient ETH for gas
- Monitor gas prices and set limits
- Implement gas price oracles for optimization

### 3. Fee Collection
- Configure `RUBIC_CROSS_CHAIN_FEE_ADDRESS` and `RUBIC_ON_CHAIN_FEE_ADDRESS`
- These addresses receive protocol fees from swaps
- Must be valid Ethereum addresses

## Testing

### Development Testing
```bash
# Without wallet (simulated execution)
npm run dev

# Check health
curl http://localhost:8080/api/trading/health
```

### Production Testing
```bash
# With wallet configured
export SWAP_WALLET_PRIVATE_KEY=0x...
npm run start

# Test quote
curl -X POST http://localhost:8080/api/trading/quote \
  -H "Content-Type: application/json" \
  -d '{"fromToken":"XRP","toToken":"BTC","amount":"100"}'
```

## Troubleshooting

### SDK Initialization Fails
- Verify RPC endpoints are accessible
- Check Infura project ID is valid
- Ensure network connectivity

### Wallet Not Initializing
- Verify `SWAP_WALLET_PRIVATE_KEY` format (0x prefix)
- Check wallet has sufficient ETH for gas
- Confirm RPC provider is working

### Trade Execution Fails
- Ensure trade is cached (executed within 5 minutes of quote)
- Verify wallet has sufficient token balance
- Check gas prices and limits
- Review Rubic SDK error logs

### Fallback to Mock Execution
- This is normal without wallet configuration
- Set `SWAP_WALLET_PRIVATE_KEY` for real execution
- Check console warnings for wallet initialization errors

## Resources

- [Rubic SDK Documentation](https://www.npmjs.com/package/rubic-sdk)
- [Rubic SDK GitHub](https://github.com/Cryptorubic/rubic-sdk)
- [API Documentation](https://docs.rubic.exchange/)
- [ethers.js v6 Documentation](https://docs.ethers.org/v6/)

## Support

For issues related to:
- **Rubic SDK**: [GitHub Issues](https://github.com/Cryptorubic/rubic-sdk/issues)
- **LedgerSwap Integration**: Contact backend team
- **Security Concerns**: Contact security@ledgerswap.io
