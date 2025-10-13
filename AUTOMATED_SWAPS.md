# LedgerSwap Automated Swap System

## 🚀 Overview

The LedgerSwap Automated Swap System provides **100% autonomous, 24/7 cryptocurrency swapping** without human intervention. Users simply send crypto to a deposit address, and the system automatically detects the deposit, finds the best route via Rubic SDK, and executes the swap.

## 🧩 Full Automation Flow

### 1. **Deposit Detection (Trigger)**
- **Real-time blockchain monitoring** across multiple chains
- **WebSocket & polling** for instant deposit detection
- **Confirmation tracking** with chain-specific requirements
- **Multi-chain support**: Ethereum, BSC, Polygon, Arbitrum, Bitcoin, XRP, Stellar, XDC, IOTA

### 2. **Auto-Quote (Rubic SDK/API)**
Once a deposit is confirmed:
- **Automatic route fetching** from Rubic API
- **Best price discovery** across multiple DEXs
- **Cross-chain optimization** for maximum efficiency
- **Gas estimation** and slippage calculation

### 3. **Auto-Swap Execution**
- **Autonomous execution** using Rubic SDK
- **Cross-chain swaps** via bridges and DEX aggregators
- **Real-time monitoring** of swap progress
- **Automatic retry** on temporary failures

### 4. **User Notifications**
- **Email notifications** for deposit confirmation, processing, completion
- **Webhook integration** for real-time frontend updates
- **Error handling** with detailed failure notifications

## 📁 System Architecture

### Core Services

#### **AutomatedSwapService** (`/services/automatedSwapService.ts`)
- **Rubic SDK integration** for swap execution
- **Swap queue management** with priority handling
- **Error recovery** and retry mechanisms
- **Fee collection** and platform revenue

#### **DepositDetectionService** (`/services/depositDetectionService.ts`)
- **Multi-chain blockchain listeners** (WebSocket + polling)
- **Real-time transaction monitoring**
- **Confirmation tracking** with chain-specific requirements
- **Address monitoring** with expiration management

#### **NotificationService** (`/services/notificationService.ts`)
- **Email notifications** with professional templates
- **Webhook integration** for real-time updates
- **Multi-channel communication** (email, webhooks, logs)

### Controllers & Routes

#### **AutomatedSwapController** (`/controllers/automatedSwapController.ts`)
- **Admin endpoints** for system management
- **Health monitoring** and status reporting
- **Manual swap triggers** for testing/recovery
- **Queue management** and statistics

#### **AutomatedSwapRoutes** (`/routes/automatedSwapRoutes.ts`)
- **RESTful API** for system control
- **Swagger documentation** for all endpoints
- **Admin authentication** for secure access

## 🛠️ Installation & Setup

### 1. **Install Dependencies**
```bash
cd /apps/backend
npm install ethers@^6.8.0 nodemailer@^6.9.7 @types/nodemailer@^6.4.14
```

### 2. **Environment Configuration**
Add to your `.env` file:
```bash
# Automated Swap System
ENABLE_AUTOMATED_SWAPS=true

# Wallet Configuration (CRITICAL - Keep Secure!)
SWAP_WALLET_ADDRESS=0x1234567890123456789012345678901234567890
SWAP_WALLET_PRIVATE_KEY=your_private_key_here

# Blockchain RPC Endpoints
INFURA_ETHEREUM_RPC=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
ALCHEMY_ETHEREUM_RPC=https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY

# Rubic SDK Configuration
RUBIC_CROSS_CHAIN_FEE_ADDRESS=0x0000000000000000000000000000000000000000
RUBIC_ON_CHAIN_FEE_ADDRESS=0x0000000000000000000000000000000000000000

# Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@ledgerswap.io

# Webhook Integration (Optional)
WEBHOOK_URL=https://your-frontend.com/api/webhooks/swap-updates
WEBHOOK_SECRET=your-webhook-secret

# Logging Configuration
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_DIR=./logs
```

### 3. **Start the System**

#### **Automatic Startup** (Recommended)
The system starts automatically when the backend starts if `ENABLE_AUTOMATED_SWAPS=true`.

#### **Manual Startup**
```bash
# Start automated swap system independently
npm run start:automated-swaps

# Or via API endpoint (admin required)
curl -X POST http://localhost:5000/api/automated-swaps/start \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 📊 API Endpoints

### **System Control**
```bash
# Start automated swap system
POST /api/automated-swaps/start

# Stop automated swap system  
POST /api/automated-swaps/stop

# Get system status
GET /api/automated-swaps/status

# Health check (public)
GET /api/automated-swaps/health
```

### **Monitoring & Management**
```bash
# Get swap queue information
GET /api/automated-swaps/queue

# Manually trigger swap (testing/recovery)
POST /api/automated-swaps/manual/{exchangeId}

# Add address to monitoring
POST /api/automated-swaps/monitor
```

### **Example API Response**
```json
{
  "status": "running",
  "swapService": {
    "queueSize": 3,
    "processing": 1,
    "isInitialized": true
  },
  "depositMonitoring": {
    "isRunning": true,
    "monitoredAddresses": 15,
    "activeChains": 4
  },
  "statistics": {
    "total": 1247,
    "completed": 1198,
    "failed": 12,
    "processing": 3,
    "successRate": "96.07%",
    "last24Hours": 89,
    "lastHour": 7
  }
}
```

## 🔗 Supported Blockchains

### **EVM Chains**
- **Ethereum** - ETH, USDT, USDC, WBTC, wrapped tokens
- **Binance Smart Chain** - BNB, BUSD, PancakeSwap tokens  
- **Polygon** - MATIC, Polygon ecosystem tokens
- **Arbitrum** - ARB, L2 optimized tokens

### **Native Chains**
- **Bitcoin** - BTC (via wrapped tokens and bridges)
- **XRP Ledger** - XRP (native and wrapped)
- **Stellar** - XLM (native and anchored assets)
- **XDC Network** - XDC (native and ecosystem tokens)
- **IOTA** - MIOTA (via bridges and wrapped tokens)

## ⚡ Key Features

### **24/7 Autonomous Operation**
- **No human intervention** required
- **Automatic deposit detection** across all supported chains
- **Real-time swap execution** with optimal routing
- **Error recovery** and retry mechanisms

### **Multi-Chain Support**
- **Cross-chain swaps** via Rubic bridges
- **Native token support** for major blockchains
- **Wrapped token handling** for Bitcoin and others
- **Bridge optimization** for lowest fees

### **Professional Grade**
- **Rubic SDK integration** for enterprise-level routing
- **Gas optimization** and MEV protection
- **Slippage protection** with configurable tolerances
- **Transaction monitoring** with confirmation tracking

### **Revenue Generation**
- **Platform fees** collected automatically (2% default)
- **Fee customization** per currency pair
- **Revenue tracking** and reporting
- **Admin fee management** via dashboard

## 🔧 Configuration Options

### **Swap Configuration**
```typescript
interface SwapConfig {
  fromToken: string;           // Source currency
  fromChain: string;          // Source blockchain
  toToken: string;            // Destination currency  
  toChain: string;            // Destination blockchain
  amount: string;             // Swap amount
  recipientAddress: string;   // Recipient wallet
  slippageTolerance: number;  // Max slippage (0.03 = 3%)
}
```

### **Monitoring Configuration**
```typescript
interface MonitoredAddress {
  address: string;            // Deposit address to monitor
  exchangeId: string;         // Associated exchange ID
  currency: string;           // Expected currency
  expectedAmount: number;     // Expected deposit amount
  expiresAt: Date;           // Monitoring expiration
}
```

## 📈 Monitoring & Analytics

### **Real-time Metrics**
- **Swap success rate** and performance statistics
- **Processing times** and queue status
- **Error rates** and failure analysis
- **Revenue tracking** and fee collection

### **Health Monitoring**
- **Service status** (Rubic SDK, deposit detection)
- **Blockchain connectivity** across all chains
- **Queue performance** and processing times
- **Error alerting** and notification system

### **Admin Dashboard Integration**
- **Live system status** in admin panel
- **Swap queue visualization** 
- **Performance analytics** and charts
- **Manual intervention** tools for edge cases

## 🚨 Security & Safety

### **Wallet Security**
- **Private key encryption** and secure storage
- **Multi-signature support** (recommended for production)
- **Hardware wallet integration** for maximum security
- **Key rotation** and backup procedures

### **Transaction Safety**
- **Confirmation requirements** per blockchain
- **Amount verification** before swap execution
- **Address validation** and blacklist checking
- **Slippage protection** and MEV resistance

### **Error Handling**
- **Automatic retry** on temporary failures
- **Graceful degradation** when services are unavailable
- **User notification** for failed swaps
- **Refund processing** for unrecoverable failures

## 🎯 Production Deployment

### **Environment Setup**
1. **Secure wallet configuration** with proper key management
2. **RPC endpoint redundancy** across multiple providers
3. **Email service configuration** for user notifications
4. **Monitoring and alerting** for system health
5. **Backup and recovery** procedures

### **Performance Optimization**
- **Connection pooling** for blockchain RPC calls
- **Caching strategies** for frequently accessed data
- **Queue optimization** for high-volume periods
- **Load balancing** across multiple service instances

### **Maintenance**
- **Regular health checks** and system monitoring
- **Log rotation** and storage management
- **Performance tuning** based on usage patterns
- **Security updates** and dependency management

## 📞 Support & Troubleshooting

### **Common Issues**
1. **RPC connection failures** - Check endpoint configuration
2. **Insufficient gas** - Verify wallet funding
3. **Slippage exceeded** - Adjust tolerance settings
4. **Deposit not detected** - Verify blockchain sync status

### **Debugging Tools**
- **Comprehensive logging** with configurable levels
- **Health check endpoints** for system status
- **Manual swap triggers** for testing
- **Queue inspection** and management tools

### **Contact Information**
- **Technical Support**: support@ledgerswap.io
- **API Documentation**: https://ledgerswap.io/api-docs
- **Admin Panel**: https://ledgerswap.io/admin
- **System Status**: https://ledgerswap.io/api/automated-swaps/health

---

**🎉 The LedgerSwap Automated Swap System provides enterprise-grade, fully autonomous cryptocurrency swapping with 24/7 operation, multi-chain support, and professional-level reliability.**
