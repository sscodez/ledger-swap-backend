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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_CHAINS = void 0;
exports.initializeDepositAddresses = initializeDepositAddresses;
exports.processSwapOrder = processSwapOrder;
exports.checkNewDeposits = checkNewDeposits;
exports.getOrCreateDepositAddress = getOrCreateDepositAddress;
exports.signRequest = signRequest;
exports.kucoinRequest = kucoinRequest;
exports.getConvertQuote = getConvertQuote;
exports.placeConvertOrder = placeConvertOrder;
exports.checkConvertOrderStatus = checkConvertOrderStatus;
exports.internalTransfer = internalTransfer;
exports.withdrawToAddress = withdrawToAddress;
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
exports.SUPPORTED_CHAINS = SUPPORTED_CHAINS;
// Store processed deposits to avoid duplicates
const processedDeposits = new Set();
/**
 * Signs requests according to KuCoin's authentication requirements
 */
function signRequest(method, endpoint, body = '') {
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
function kucoinRequest(method_1, endpoint_1) {
    return __awaiter(this, arguments, void 0, function* (method, endpoint, params = {}, data = {}) {
        var _a;
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
        const options = { method, url, headers };
        if (bodyStr)
            options.data = data;
        try {
            const response = yield axios(options);
            return response.data;
        }
        catch (error) {
            console.error('❌ KuCoin API Error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw error;
        }
    });
}
/**
 * Get or create deposit address for a currency
 */
function getOrCreateDepositAddress(currency, chain) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // First try to get existing addresses
            const existingRes = yield kucoinRequest('GET', '/api/v3/deposit-addresses', { currency });
            if (existingRes.data && existingRes.data.length > 0) {
                const chainAddress = existingRes.data.find((addr) => addr.chain === chain);
                if (chainAddress) {
                    console.log(`📍 Using existing ${currency} (${chain}) address:`, chainAddress.address);
                    return chainAddress;
                }
            }
            // Create new address if none exists
            const body = { currency, chain, to: 'MAIN' };
            const createRes = yield kucoinRequest('POST', '/api/v3/deposit-address/create', {}, body);
            if (createRes.code !== '200000') {
                console.error('Create deposit address failed:', createRes);
                return null;
            }
            console.log(`✅ New ${currency} (${chain}) address created:`, createRes.data.address);
            return createRes.data;
        }
        catch (error) {
            console.error('Error with deposit address:', error.message);
            return null;
        }
    });
}
/**
 * Get conversion quote
 */
function getConvertQuote(fromCurrency, toCurrency, fromSize) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const params = {
                fromCurrency,
                toCurrency,
                fromCurrencySize: fromSize.toString()
            };
            const res = yield kucoinRequest('GET', '/api/v1/convert/quote', params);
            if (res.code !== '200000') {
                console.error('Quote failed:', res);
                return null;
            }
            console.log(`💵 Quote: ${fromSize} ${fromCurrency} = ${res.data.toCurrencySize} ${toCurrency}`);
            return res.data;
        }
        catch (error) {
            console.error('Error getting quote:', error.message);
            return null;
        }
    });
}
/**
 * Place a convert order
 */
function placeConvertOrder(fromCurrency, toCurrency, fromSize, toSize) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const clientOid = crypto.randomUUID();
            const orderBody = {
                clientOrderId: clientOid,
                fromCurrency,
                toCurrency,
                fromCurrencySize: fromSize.toString(),
                toCurrencySize: toSize.toString()
            };
            const res = yield kucoinRequest('POST', '/api/v1/convert/limit/order', {}, orderBody);
            if (res.code !== '200000') {
                console.error('Convert order failed:', res);
                return null;
            }
            console.log(`💱 Convert order placed: ${fromCurrency} → ${toCurrency}`);
            console.log(`   Order ID: ${res.data.orderId}`);
            return res.data;
        }
        catch (error) {
            console.error('Error placing convert order:', error.message);
            return null;
        }
    });
}
/**
 * Check convert order status
 */
function checkConvertOrderStatus(orderId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield kucoinRequest('GET', '/api/v1/convert/limit/order/detail', { orderId });
            return res.data;
        }
        catch (error) {
            console.error('Error checking order status:', error.message);
            return null;
        }
    });
}
/**
 * Internal transfer between accounts
 */
function internalTransfer(currency, amount, fromType, toType) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transferBody = {
                clientOid: crypto.randomUUID(),
                currency,
                amount: amount.toString(),
                type: 'INTERNAL',
                fromAccountType: fromType,
                toAccountType: toType
            };
            const res = yield kucoinRequest('POST', '/api/v3/accounts/universal-transfer', {}, transferBody);
            console.log(`💸 Transferred ${amount} ${currency} from ${fromType} to ${toType}`);
            return res.data;
        }
        catch (error) {
            console.error('Error during transfer:', error.message);
            return null;
        }
    });
}
/**
 * Withdraw funds to external address
 */
function withdrawToAddress(currency, amount, address, memo) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const withdrawBody = {
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
            const res = yield kucoinRequest('POST', '/api/v3/withdrawals', {}, withdrawBody);
            if (res.code !== '200000') {
                console.error('Withdrawal failed:', res);
                return null;
            }
            console.log(`💸 Withdrawal initiated: ${amount} ${currency} to ${address}`);
            return res.data;
        }
        catch (error) {
            console.error('Error during withdrawal:', error.message);
            return null;
        }
    });
}
/**
 * Check for new deposits
 */
function checkNewDeposits() {
    return __awaiter(this, void 0, void 0, function* () {
        const newDeposits = [];
        for (const [key, config] of Object.entries(SUPPORTED_CHAINS)) {
            try {
                const res = yield kucoinRequest('GET', '/api/v1/deposits', {
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
            }
            catch (error) {
                console.error(`Error checking ${config.currency} deposits:`, error.message);
            }
        }
        return newDeposits;
    });
}
/**
 * Process a swap order for a user
 */
function processSwapOrder(deposit, targetCurrency, userOrderId, recipientAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n🔄 Starting swap process...');
        console.log(`   Deposit: ${deposit.amount} ${deposit.currency}`);
        console.log(`   Target: ${targetCurrency}`);
        console.log(`   User Order ID: ${userOrderId}`);
        try {
            // Step 1: Get conversion quote
            console.log('\n📊 Step 1: Getting conversion quote...');
            const quote = yield getConvertQuote(deposit.currency, targetCurrency, deposit.amount);
            if (!quote) {
                console.error('❌ Failed to get quote');
                return { success: false, error: 'Quote failed' };
            }
            // Step 2: Transfer to TRADE account if needed
            console.log('\n📦 Step 2: Transferring to TRADE account...');
            const transferResult = yield internalTransfer(deposit.currency, deposit.amount, 'MAIN', 'TRADE');
            if (!transferResult) {
                console.error('❌ Transfer to TRADE account failed');
                return { success: false, error: 'Transfer failed' };
            }
            // Wait a bit for transfer to settle
            yield new Promise(resolve => setTimeout(resolve, 2000));
            // Step 3: Place convert order
            console.log('\n💱 Step 3: Placing convert order...');
            const convertOrder = yield placeConvertOrder(deposit.currency, targetCurrency, deposit.amount, quote.toCurrencySize);
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
                yield new Promise(resolve => setTimeout(resolve, 2000));
                orderStatus = yield checkConvertOrderStatus(convertOrder.orderId);
                if (orderStatus && orderStatus.status === 'FILLED') {
                    console.log('✅ Order FILLED successfully!');
                    break;
                }
                else if (orderStatus && orderStatus.status === 'FAILED') {
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
            yield internalTransfer(targetCurrency, finalAmount, 'TRADE', 'MAIN');
            // Step 6: Withdraw to recipient address if provided
            let withdrawalResult = null;
            if (recipientAddress) {
                console.log('\n💸 Step 6: Withdrawing to recipient address...');
                withdrawalResult = yield withdrawToAddress(targetCurrency, finalAmount, recipientAddress);
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
        }
        catch (error) {
            console.error('❌ Error during swap process:', error.message);
            return { success: false, error: error.message };
        }
    });
}
/**
 * Initialize deposit addresses for all supported currencies
 */
function initializeDepositAddresses() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('📍 Setting up deposit addresses...\n');
        const addresses = {};
        for (const [key, config] of Object.entries(SUPPORTED_CHAINS)) {
            const address = yield getOrCreateDepositAddress(config.currency, config.chain);
            if (address) {
                addresses[key] = address.address;
            }
            yield new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
        }
        console.log('\n✅ Deposit addresses ready:');
        for (const [key, address] of Object.entries(addresses)) {
            console.log(`   ${key}: ${address}`);
        }
        return addresses;
    });
}
