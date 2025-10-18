# LedgerSwap Multi-Chain Swap System

## 🌐 Overview

A comprehensive SimpleSwap-like multi-chain cryptocurrency swap backend supporting **BTC, XLM, XRP, XDC (XinFin), and MIOTA** chains with their native tokens. This system provides:

- ✅ Native blockchain integration for 5 major chains
- ✅ Token support on each chain (ERC20, XRC20, Stellar assets, XRP trustlines, IOTA tokens)
- ✅ Admin panel for managing chains and tokens
- ✅ Unified swap engine with multi-provider liquidity aggregation
- ✅ Real-time deposit monitoring and automatic swap execution
- ✅ Cross-chain swap routing with bridge support

---

## 📋 Supported Chains

### 1. **Bitcoin (BTC)**
- **Type**: UTXO-based blockchain
- **Native Token**: BTC (8 decimals)
- **Average Block Time**: 10 minutes
- **Token Support**: No (native BTC only)
- **Features**: UTXO tracking, fee estimation, address monitoring

### 2. **Stellar (XLM)**
- **Type**: Account-based blockchain
- **Native Token**: XLM (7 decimals)
- **Average Block Time**: 5 seconds
- **Token Support**: Yes (Stellar assets with trustlines)
- **Features**: Sub-second finality, built-in DEX, anchored assets

### 3. **XRP Ledger (XRP)**
- **Type**: Account-based blockchain
- **Native Token**: XRP (6 decimals)
- **Average Block Time**: 4 seconds
- **Token Support**: Yes (Trustlines with issuers)
- **Features**: Instant settlement, low fees, destination tags

### 4. **XDC Network (XDC/XinFin)**
- **Type**: EVM-compatible blockchain
- **Native Token**: XDC (18 decimals)
- **Average Block Time**: 2 seconds
- **Token Support**: Yes (XRC20 tokens)
- **Features**: Enterprise-focused, hybrid consensus, smart contracts

### 5. **IOTA (MIOTA)**
- **Type**: Directed Acyclic Graph (DAG)
- **Native Token**: MIOTA (6 decimals)
- **Average Block Time**: 10 seconds
- **Token Support**: Yes (Native tokens on Tangle)
- **Features**: Feeless transactions, IoT-optimized, quantum-resistant

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Admin Panel                      │
│          (AdminTokenChainManagementPage.tsx)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ API Calls
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Backend API Layer                          │
│  • Chain Routes (/api/chains)                               │
│  • Token Routes (/api/tokens)                               │
│  • Trading Routes (/api/trading)                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │
┌──────────────────────────▼──────────────────────────────────┐
│            Multi-Chain Swap Engine                           │
│  • Quote Aggregation                                        │
│  • Routing Optimization                                      │
│  • Provider Selection (Rubic, Internal LP)                  │
└──────────┬──────────────┬──────────────┬────────────────────┘
           │              │              │
           │              │              │
┌──────────▼───┐  ┌───────▼───┐  ┌──────▼──────┐
│ Blockchain   │  │ Blockchain │  │  Blockchain │
│ Services     │  │ Services   │  │  Services   │
│             │  │            │  │             │
│ • Bitcoin   │  │ • XRP      │  │ • IOTA      │
│ • Stellar   │  │ • XDC      │  │             │
└─────────────┘  └────────────┘  └─────────────┘
```

---

## 📂 File Structure

```
apps/backend/src/
├── models/
│   ├── Chain.ts                    # Enhanced chain model
│   └── Token.ts                    # Enhanced token model
│
├── services/
│   ├── blockchains/
│   │   ├── bitcoinService.ts       # Bitcoin integration
│   │   ├── stellarService.ts       # Stellar integration
│   │   ├── xrpService.ts          # XRP Ledger integration
│   │   ├── xdcService.ts          # XDC Network integration
│   │   └── iotaService.ts         # IOTA integration
│   │
│   └── multiChainSwapEngine.ts     # Unified swap engine
│
├── controllers/
│   ├── chainController.ts          # Chain CRUD operations
│   └── tokenController.ts          # Token CRUD operations
│
├── routes/
│   ├── chainRoutes.ts              # Chain API routes
│   └── tokenRoutes.ts              # Token API routes
│
└── scripts/
    └── seedChainsAndTokens.ts      # Database seeder
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd /Users/mac/Documents/LedgerSwap/apps/backend
npm install web3 axios
```

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Bitcoin
BITCOIN_RPC_URL=https://blockstream.info/api
BTC_MASTER_ADDRESS=your_btc_address

# Stellar
STELLAR_HORIZON_URL=https://horizon.stellar.org
XLM_MASTER_ADDRESS=your_stellar_address

# XRP Ledger
XRP_RPC_URL=https://s1.ripple.com:51234
XRP_MASTER_ADDRESS=your_xrp_address

# XDC Network
XDC_RPC_URL=https://rpc.xinfin.network
XDC_MASTER_ADDRESS=your_xdc_address

# IOTA
IOTA_NODE_URL=https://api.shimmer.network
IOTA_MASTER_ADDRESS=your_iota_address

# Enable multi-chain swaps
ENABLE_MULTI_CHAIN_SWAPS=true
```

### 3. Seed Database

```bash
npm run seed:chains
# or
node dist/scripts/seedChainsAndTokens.js
```

### 4. Start Server

```bash
npm run dev
```

---

## 🔌 API Endpoints

### Chain Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/chains` | Get all chains | Public |
| GET | `/api/chains/:key` | Get chain by key | Public |
| GET | `/api/chains/stats` | Get chain statistics | Public |
| POST | `/api/chains` | Create new chain | Admin |
| PUT | `/api/chains/:key` | Update chain | Admin |
| PATCH | `/api/chains/:key/status` | Enable/disable chain | Admin |
| DELETE | `/api/chains/:key` | Delete chain | Admin |

### Token Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/tokens` | Get all tokens | Public |
| GET | `/api/tokens/:key` | Get token by key | Public |
| GET | `/api/tokens/chain/:chainKey` | Get tokens by chain | Public |
| GET | `/api/tokens/search?query=USDC` | Search tokens | Public |
| GET | `/api/tokens/stats` | Get token statistics | Public |
| POST | `/api/tokens` | Create new token | Admin |
| POST | `/api/tokens/bulk` | Bulk create tokens | Admin |
| PUT | `/api/tokens/:key` | Update token | Admin |
| PATCH | `/api/tokens/:key/status` | Enable/disable token | Admin |
| DELETE | `/api/tokens/:key` | Delete token | Admin |

---

## 🎯 Admin Panel Integration

The admin panel at `/admin/token-chain-management` already exists and needs to be updated to use the new API endpoints:

### Update AdminTokenChainManagementPage.tsx

Replace the existing admin service calls with:

```typescript
// Get chains
const chains = await fetch('/api/chains').then(r => r.json());

// Get tokens
const tokens = await fetch('/api/tokens').then(r => r.json());

// Create token
await fetch('/api/tokens', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    symbol: 'USDC',
    name: 'USD Coin',
    chainKey: 'stellar',
    tokenType: 'stellar-asset',
    issuerAddress: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    decimals: 7,
    enabled: true,
    isStablecoin: true,
    liquidityScore: 90
  })
});

// Toggle token status
await fetch(`/api/tokens/${tokenKey}/status`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ enabled: true })
});
```

---

## 💡 Usage Examples

### 1. Get Best Swap Quote

```typescript
import { multiChainSwapEngine } from './services/multiChainSwapEngine';

const quote = await multiChainSwapEngine.getBestQuote(
  'btc-bitcoin',     // From token key
  'xlm-stellar',     // To token key
  '0.1'             // Amount
);

console.log(`Rate: ${quote.exchangeRate}`);
console.log(`Output: ${quote.toAmount} XLM`);
console.log(`Provider: ${quote.provider}`);
console.log(`Estimated time: ${quote.estimatedTime}s`);
```

### 2. Execute Swap

```typescript
const execution = await multiChainSwapEngine.executeSwap(
  'exchange-12345',                    // Exchange ID
  quote,                               // Quote object
  'GXXXXXXXXX...'                      // Recipient address
);

console.log(`Deposit to: ${execution.depositAddress}`);
console.log(`Status: ${execution.status}`);
```

### 3. Monitor Bitcoin Address

```typescript
import { bitcoinService } from './services/blockchains/bitcoinService';

const intervalId = await bitcoinService.monitorAddress(
  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  (tx) => {
    console.log(`Received ${tx.amount} BTC`);
    console.log(`TX: ${tx.txid}`);
  }
);
```

### 4. Check Stellar Balance

```typescript
import { stellarService } from './services/blockchains/stellarService';

const balance = await stellarService.getBalance(
  'GXXXXXXXXX...',
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
);

console.log(`Balance: ${balance} USDC`);
```

---

## 🔐 Security Features

1. **Admin-Only Endpoints**: Chain and token management requires admin authentication
2. **Flagged Address Checks**: Integrated with existing flagged address system
3. **Rate Limiting**: Built-in rate limiting for API endpoints
4. **Address Validation**: Chain-specific address validation before processing
5. **Transaction Monitoring**: Real-time monitoring with confirmation requirements

---

## 📊 Seeded Data

After running the seeder, you'll have:

### Chains (5)
- Bitcoin (BTC) - UTXO
- Stellar (XLM) - Account
- XRP Ledger (XRP) - Account  
- XDC Network (XDC) - EVM
- IOTA (MIOTA) - DAG

### Tokens (9)
- **Bitcoin**: BTC (native)
- **Stellar**: XLM (native), USDC (asset)
- **XRP**: XRP (native), USD (trustline)
- **XDC**: XDC (native), WXDC (XRC20), USDT (XRC20)
- **IOTA**: MIOTA (native)

---

## 🛠️ Blockchain Integration Details

### Bitcoin Service
- **Address Types**: P2PKH, P2SH, Bech32
- **Features**: UTXO management, fee estimation, mempool monitoring
- **API**: Blockstream, Blockchain.info

### Stellar Service
- **Features**: Trustlines, anchored assets, streaming payments
- **API**: Horizon (REST + SSE)
- **Special**: Built-in DEX integration

### XRP Service
- **Features**: Destination tags, trustlines, escrows
- **API**: Rippled JSON-RPC
- **Special**: Sub-5-second settlement

### XDC Service
- **Features**: EVM compatibility, XRC20 tokens
- **API**: Web3 JSON-RPC
- **Special**: Address format conversion (xdc ↔ 0x)

### IOTA Service
- **Features**: Feeless transfers, native tokens
- **API**: Hornet/Bee REST API
- **Special**: DAG-based confirmation

---

## 🎨 Admin UI Features

The admin panel provides:

✅ **Chain Management**
- View all supported blockchains
- Enable/disable chains
- Update RPC endpoints
- Monitor chain statistics

✅ **Token Management**
- Add tokens to any chain
- Configure token properties (decimals, limits, liquidity score)
- Enable/disable tokens
- Search and filter tokens
- Bulk token creation

✅ **Token Properties**
- Symbol and name
- Chain assignment
- Token type (native, ERC20, XRC20, etc.)
- Contract address
- Issuer address (for Stellar/XRP)
- Decimals
- Min/max swap amounts
- Liquidity score
- Stablecoin flag
- CoinGecko ID for price feeds

---

## 🚦 Next Steps

1. **Configure RPC Endpoints**: Add your own RPC URLs in `.env`
2. **Test Blockchain Connections**: Verify each service can connect
3. **Add More Tokens**: Use admin panel to add popular tokens
4. **Configure Liquidity Providers**: Add DEX integrations
5. **Set Up Monitoring**: Configure alerts for failed transactions
6. **Deploy**: Deploy backend to production environment

---

## 📝 Environment Variables Reference

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/ledgerswap

# Bitcoin
BITCOIN_RPC_URL=https://blockstream.info/api
BTC_MASTER_ADDRESS=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
BTC_PRIVATE_KEY=your_btc_private_key

# Stellar
STELLAR_HORIZON_URL=https://horizon.stellar.org
XLM_MASTER_ADDRESS=GXXXXXXXXX...
XLM_SECRET_KEY=SXXXXXXXXX...

# XRP Ledger
XRP_RPC_URL=https://s1.ripple.com:51234
XRP_MASTER_ADDRESS=rXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XRP_SECRET=sXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# XDC Network
XDC_RPC_URL=https://rpc.xinfin.network
XDC_MASTER_ADDRESS=xdcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XDC_PRIVATE_KEY=your_xdc_private_key

# IOTA
IOTA_NODE_URL=https://api.shimmer.network
IOTA_MASTER_ADDRESS=iota1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
IOTA_SEED=your_iota_seed

# Features
ENABLE_MULTI_CHAIN_SWAPS=true
ENABLE_AUTOMATED_SWAPS=true
```

---

## 🐛 Troubleshooting

### Issue: Chain connection fails
**Solution**: Check RPC endpoints are accessible and not rate-limited

### Issue: Token not showing in swap
**Solution**: Ensure token is enabled and has liquidityScore > 0

### Issue: Deposit not detected
**Solution**: Check confirmationsRequired setting for the chain

### Issue: Admin can't add tokens
**Solution**: Verify admin authentication token is valid

---

## 📚 Additional Resources

- [Bitcoin API Documentation](https://blockstream.info/api)
- [Stellar Horizon API](https://developers.stellar.org/api/horizon)
- [XRP Ledger API](https://xrpl.org/http-websocket-apis.html)
- [XDC Network Documentation](https://docs.xdc.org/)
- [IOTA Documentation](https://wiki.iota.org/)

---

## ✨ Features

✅ **Multi-Chain Support**: 5 major blockchains integrated
✅ **Token Management**: Full CRUD for chains and tokens
✅ **Admin Panel**: Complete management interface
✅ **Real-Time Monitoring**: Deposit detection across all chains
✅ **Cross-Chain Swaps**: Automatic routing and bridging
✅ **Price Feeds**: CoinGecko integration for real-time rates
✅ **Liquidity Aggregation**: Multiple provider support
✅ **Security**: Address validation, flagged checks, admin-only operations

---

**Built with ❤️ for LedgerSwap**
