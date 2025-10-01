const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const API_KEY = process.env.KUCOIN_API_KEY;
const API_SECRET = process.env.KUCOIN_API_SECRET;
const API_PASSPHRASE = process.env.KUCOIN_API_PASSPHRASE;
const API_BASE = 'https://api.kucoin.com';

// Supported chains configuration
const SUPPORTED_CHAINS = {
  XDC: { currency: 'XDC', chain: 'xdc' },
  BTC: { currency: 'BTC', chain: 'btc' },
  XLM: { currency: 'XLM', chain: 'xlm' },
  XRP: { currency: 'XRP', chain: 'xrp' }
};

// Store processed deposits to avoid duplicates
const processedDeposits = new Set();

/**
 * Signs requests according to KuCoin's authentication requirements
 */
function signRequest(method: string, endpoint: string, body: string = ''): { signature: string; timestamp: string; passphrase: string } {
  const timestamp = Date.now().toString();
  const strForSign = timestamp + method.toUpperCase() + endpoint + body;
  const hmac = crypto.createHmac('sha256', API_SECRET);
  const signature = hmac.update(strForSign).digest('base64');
  const passphrase = crypto.createHmac('sha256', API_SECRET)
    .update(API_PASSPHRASE)
    .digest('base64');
  return { signature, timestamp, passphrase };
}

/**
 * Generic authenticated request to KuCoin API
 */
async function kucoinRequest(method: string, endpoint: string, params: any = {}, data: any = {}): Promise<any> {
  let url = API_BASE + endpoint;
  let queryString = '';
  
  if (method === 'GET' && Object.keys(params).length) {
    queryString = '?' + new URLSearchParams(params).toString();
    url += queryString;
  }
  
  const bodyStr = method === 'POST' ? JSON.stringify(data) : '';
  const endpointWithQuery = endpoint + queryString;
  const { signature, timestamp, passphrase } = signRequest(method, endpointWithQuery, bodyStr);
  
  const headers = {
    'KC-API-KEY': API_KEY,
    'KC-API-SIGN': signature,
    'KC-API-TIMESTAMP': timestamp,
    'KC-API-PASSPHRASE': passphrase,
    'KC-API-KEY-VERSION': '2',
    'Content-Type': 'application/json'
  };
  
  const options: any = { method, url, headers };
  if (bodyStr) options.data = data;
  
  try {
    const response = await axios(options);
    return response.data;
  } catch (error: any) {
    console.error('❌ KuCoin API Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get or create deposit address for a currency
 */
async function getOrCreateDepositAddress(currency: string, chain: string): Promise<any> {
  try {
    // First try to get existing addresses
    const existingRes = await kucoinRequest('GET', '/api/v3/deposit-addresses', { currency });
    
    if (existingRes.data && existingRes.data.length > 0) {
      const chainAddress = existingRes.data.find((addr: any) => addr.chain === chain);
      if (chainAddress) {
        console.log(`📍 Using existing ${currency} (${chain}) address:`, chainAddress.address);
        return chainAddress;
      }
    }
    
    // Create new address if none exists
    const body = { currency, chain, to: 'MAIN' };
    const createRes = await kucoinRequest('POST', '/api/v3/deposit-address/create', {}, body);
    
    if (createRes.code !== '200000') {
      console.error('Create deposit address failed:', createRes);
      return null;
    }
    
    console.log(`✅ New ${currency} (${chain}) address created:`, createRes.data.address);
    return createRes.data;
  } catch (error: any) {
    console.error('Error with deposit address:', error.message);
    return null;
  }
}

/**
 * Get conversion quote
 */
async function getConvertQuote(fromCurrency: string, toCurrency: string, fromSize: number): Promise<any> {
  try {
    const params = {
      fromCurrency,
      toCurrency,
      fromCurrencySize: fromSize.toString()
    };
    const res = await kucoinRequest('GET', '/api/v1/convert/quote', params);
    
    if (res.code !== '200000') {
      console.error('Quote failed:', res);
      return null;
    }
    
    console.log(`💵 Quote: ${fromSize} ${fromCurrency} = ${res.data.toCurrencySize} ${toCurrency}`);
    return res.data;
  } catch (error: any) {
    console.error('Error getting quote:', error.message);
    return null;
  }
}

/**
 * Place a convert order
 */
async function placeConvertOrder(fromCurrency: string, toCurrency: string, fromSize: number, toSize: number): Promise<any> {
  try {
    const clientOid = crypto.randomUUID();
    const orderBody = {
      clientOrderId: clientOid,
      fromCurrency,
      toCurrency,
      fromCurrencySize: fromSize.toString(),
      toCurrencySize: toSize.toString()
    };
    
    const res = await kucoinRequest('POST', '/api/v1/convert/limit/order', {}, orderBody);
    
    if (res.code !== '200000') {
      console.error('Convert order failed:', res);
      return null;
    }
    
    console.log(`💱 Convert order placed: ${fromCurrency} → ${toCurrency}`);
    console.log(`   Order ID: ${res.data.orderId}`);
    return res.data;
  } catch (error: any) {
    console.error('Error placing convert order:', error.message);
    return null;
  }
}

/**
 * Check convert order status
 */
async function checkConvertOrderStatus(orderId: string): Promise<any> {
  try {
    const res = await kucoinRequest('GET', '/api/v1/convert/limit/order/detail', { orderId });
    return res.data;
  } catch (error: any) {
    console.error('Error checking order status:', error.message);
    return null;
  }
}

/**
 * Internal transfer between accounts
 */
async function internalTransfer(currency: string, amount: number, fromType: string, toType: string): Promise<any> {
  try {
    const transferBody = {
      clientOid: crypto.randomUUID(),
      currency,
      amount: amount.toString(),
      type: 'INTERNAL',
      fromAccountType: fromType,
      toAccountType: toType
    };
    
    const res = await kucoinRequest('POST', '/api/v3/accounts/universal-transfer', {}, transferBody);
    console.log(`💸 Transferred ${amount} ${currency} from ${fromType} to ${toType}`);
    return res.data;
  } catch (error: any) {
    console.error('Error during transfer:', error.message);
    return null;
  }
}

/**
 * Withdraw funds to external address
 */
async function withdrawToAddress(currency: string, amount: number, address: string, memo?: string): Promise<any> {
  try {
    const withdrawBody: any = {
      clientOid: crypto.randomUUID(),
      currency,
      amount: amount.toString(),
      address,
      remark: `LedgerSwap withdrawal - ${new Date().toISOString()}`
    };
    
    // Add memo for XRP/XLM if provided
    if (memo && (currency === 'XRP' || currency === 'XLM')) {
      withdrawBody.memo = memo;
    }
    
    const res = await kucoinRequest('POST', '/api/v3/withdrawals', {}, withdrawBody);
    
    if (res.code !== '200000') {
      console.error('Withdrawal failed:', res);
      return null;
    }
    
    console.log(`💸 Withdrawal initiated: ${amount} ${currency} to ${address}`);
    return res.data;
  } catch (error: any) {
    console.error('Error during withdrawal:', error.message);
    return null;
  }
}

/**
 * Check for new deposits
 */
async function checkNewDeposits(): Promise<any[]> {
  const newDeposits = [];
  
  for (const [key, config] of Object.entries(SUPPORTED_CHAINS)) {
    try {
      const res = await kucoinRequest('GET', '/api/v1/deposits', { 
        currency: config.currency,
        status: 'SUCCESS'
      });
      
      if (res.data && res.data.items) {
        for (const deposit of res.data.items) {
          const depositId = deposit.walletTxId;
          
          // Skip if already processed
          if (processedDeposits.has(depositId)) {
            continue;
          }
          
          // Check if deposit is recent (within last 5 minutes)
          const depositTime = new Date(deposit.createdAt);
          const now = new Date();
          const diffMinutes = (now.getTime() - depositTime.getTime()) / (1000 * 60);
          
          if (diffMinutes <= 5) {
            newDeposits.push({
              id: depositId,
              currency: deposit.currency,
              amount: parseFloat(deposit.amount),
              address: deposit.address,
              from: deposit.from,
              time: depositTime
            });
          }
        }
      }
    } catch (error: any) {
      console.error(`Error checking ${config.currency} deposits:`, error.message);
    }
  }
  
  return newDeposits;
}

/**
 * Process a swap order for a user
 */
async function processSwapOrder(deposit: any, targetCurrency: string, userOrderId: string, recipientAddress?: string): Promise<any> {
  console.log('\n🔄 Starting swap process...');
  console.log(`   Deposit: ${deposit.amount} ${deposit.currency}`);
  console.log(`   Target: ${targetCurrency}`);
  console.log(`   User Order ID: ${userOrderId}`);
  
  try {
    // Step 1: Get conversion quote
    console.log('\n📊 Step 1: Getting conversion quote...');
    const quote = await getConvertQuote(deposit.currency, targetCurrency, deposit.amount);
    
    if (!quote) {
      console.error('❌ Failed to get quote');
      return { success: false, error: 'Quote failed' };
    }
    
    // Step 2: Transfer to TRADE account if needed
    console.log('\n📦 Step 2: Transferring to TRADE account...');
    const transferResult = await internalTransfer(deposit.currency, deposit.amount, 'MAIN', 'TRADE');
    
    if (!transferResult) {
      console.error('❌ Transfer to TRADE account failed');
      return { success: false, error: 'Transfer failed' };
    }
    
    // Wait a bit for transfer to settle
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Place convert order
    console.log('\n💱 Step 3: Placing convert order...');
    const convertOrder = await placeConvertOrder(
      deposit.currency,
      targetCurrency,
      deposit.amount,
      quote.toCurrencySize
    );
    
    if (!convertOrder) {
      console.error('❌ Convert order failed');
      return { success: false, error: 'Convert order failed' };
    }
    
    // Step 4: Monitor order status
    console.log('\n⏳ Step 4: Monitoring order status...');
    let orderStatus = null;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      orderStatus = await checkConvertOrderStatus(convertOrder.orderId);
      
      if (orderStatus && orderStatus.status === 'FILLED') {
        console.log('✅ Order FILLED successfully!');
        break;
      } else if (orderStatus && orderStatus.status === 'FAILED') {
        console.log('❌ Order FAILED');
        return { success: false, error: 'Order failed' };
      }
      
      attempts++;
      console.log(`   Checking... (${attempts}/${maxAttempts})`);
    }
    
    if (!orderStatus || orderStatus.status !== 'FILLED') {
      console.log('⚠️ Order status unclear after monitoring');
      return { success: false, error: 'Order timeout' };
    }
    
    // Step 5: Transfer back to MAIN account
    console.log('\n📦 Step 5: Transferring back to MAIN account...');
    const finalAmount = parseFloat(orderStatus.toCurrencySize);
    await internalTransfer(targetCurrency, finalAmount, 'TRADE', 'MAIN');
    
    // Step 6: Withdraw to recipient address if provided
    let withdrawalResult = null;
    if (recipientAddress) {
      console.log('\n💸 Step 6: Withdrawing to recipient address...');
      withdrawalResult = await withdrawToAddress(targetCurrency, finalAmount, recipientAddress);
    }
    
    // Mark as processed
    processedDeposits.add(deposit.id);
    
    console.log('\n✅ ==========================================');
    console.log('✅ SWAP COMPLETED SUCCESSFULLY!');
    console.log(`✅ User Order: ${userOrderId}`);
    console.log(`✅ Received: ${deposit.amount} ${deposit.currency}`);
    console.log(`✅ Delivered: ${finalAmount} ${targetCurrency}`);
    if (recipientAddress) {
      console.log(`✅ Withdrawn to: ${recipientAddress}`);
    }
    console.log('✅ ==========================================\n');
    
    return {
      success: true,
      orderId: convertOrder.orderId,
      userOrderId,
      received: {
        amount: deposit.amount,
        currency: deposit.currency
      },
      delivered: {
        amount: finalAmount,
        currency: targetCurrency
      },
      withdrawal: withdrawalResult
    };
    
  } catch (error: any) {
    console.error('❌ Error during swap process:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize deposit addresses for all supported currencies
 */
async function initializeDepositAddresses(): Promise<{ [key: string]: string }> {
  console.log('📍 Setting up deposit addresses...\n');
  const addresses: { [key: string]: string } = {};
  
  for (const [key, config] of Object.entries(SUPPORTED_CHAINS)) {
    const address = await getOrCreateDepositAddress(config.currency, config.chain);
    if (address) {
      addresses[key] = address.address;
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }
  
  console.log('\n✅ Deposit addresses ready:');
  for (const [key, address] of Object.entries(addresses)) {
    console.log(`   ${key}: ${address}`);
  }
  
  return addresses;
}

export {
  initializeDepositAddresses,
  processSwapOrder,
  checkNewDeposits,
  getOrCreateDepositAddress,
  SUPPORTED_CHAINS,
  signRequest,
  kucoinRequest,
  getConvertQuote,
  placeConvertOrder,
  checkConvertOrderStatus,
  internalTransfer,
  withdrawToAddress
};
