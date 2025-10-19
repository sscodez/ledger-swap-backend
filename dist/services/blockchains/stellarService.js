"use strict";
/**
 * Stellar (XLM) Blockchain Integration Service
 * Handles Stellar transactions, assets, and trustlines
 */
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
exports.stellarService = void 0;
const axios_1 = __importDefault(require("axios"));
class StellarService {
    constructor() {
        this.horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon.stellar.org';
        this.networkPassphrase = 'Public Global Stellar Network ; September 2015';
    }
    /**
     * Get Stellar account info
     */
    getAccount(address) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield axios_1.default.get(`${this.horizonUrl}/accounts/${address}`);
                const account = response.data;
                return {
                    address: account.id,
                    sequence: account.sequence,
                    balances: account.balances,
                    subentryCount: account.subentry_count
                };
            }
            catch (error) {
                if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                    console.log(`ℹ️ Stellar account not found: ${address}`);
                    return null;
                }
                console.error(`❌ Stellar getAccount error:`, error.message);
                throw new Error(`Failed to get Stellar account: ${error.message}`);
            }
        });
    }
    /**
     * Get account balance for specific asset
     */
    getBalance(address_1) {
        return __awaiter(this, arguments, void 0, function* (address, assetCode = 'native', assetIssuer) {
            try {
                const account = yield this.getAccount(address);
                if (!account) {
                    return '0';
                }
                if (assetCode === 'native' || assetCode === 'XLM') {
                    const nativeBalance = account.balances.find(b => b.asset_type === 'native');
                    return (nativeBalance === null || nativeBalance === void 0 ? void 0 : nativeBalance.balance) || '0';
                }
                const assetBalance = account.balances.find(b => b.asset_code === assetCode && (!assetIssuer || b.asset_issuer === assetIssuer));
                return (assetBalance === null || assetBalance === void 0 ? void 0 : assetBalance.balance) || '0';
            }
            catch (error) {
                console.error(`❌ Stellar getBalance error:`, error.message);
                return '0';
            }
        });
    }
    /**
     * Get transaction details
     */
    getTransaction(hash) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.horizonUrl}/transactions/${hash}`);
                const tx = response.data;
                // Get operations to extract payment details
                const opsResponse = yield axios_1.default.get(tx._links.operations.href);
                const operations = opsResponse.data._embedded.records;
                // Find payment operation
                const paymentOp = operations.find((op) => op.type === 'payment' || op.type === 'path_payment_strict_send');
                if (!paymentOp) {
                    return null;
                }
                return {
                    hash: tx.hash,
                    from: paymentOp.from || tx.source_account,
                    to: paymentOp.to || '',
                    amount: paymentOp.amount || '0',
                    asset: {
                        code: paymentOp.asset_type === 'native' ? 'XLM' : paymentOp.asset_code,
                        issuer: paymentOp.asset_issuer
                    },
                    memo: tx.memo,
                    ledger: tx.ledger,
                    timestamp: tx.created_at
                };
            }
            catch (error) {
                console.error(`❌ Stellar getTransaction error:`, error.message);
                return null;
            }
        });
    }
    /**
     * Monitor address for new payments
     */
    monitorAddress(address, callback, assetCode, assetIssuer) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`👁️ Monitoring Stellar address: ${address}`);
            try {
                // Use Stellar's streaming API
                const url = `${this.horizonUrl}/accounts/${address}/payments`;
                const params = new URLSearchParams({ cursor: 'now', order: 'asc' });
                const eventSource = new EventSource(`${url}?${params}`);
                eventSource.onmessage = (event) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const payment = JSON.parse(event.data);
                        // Filter by asset if specified
                        if (assetCode && payment.asset_code !== assetCode) {
                            return;
                        }
                        if (assetIssuer && payment.asset_issuer !== assetIssuer) {
                            return;
                        }
                        // Only process incoming payments
                        if (payment.to !== address) {
                            return;
                        }
                        console.log(`💰 New Stellar payment detected: ${payment.transaction_hash}`);
                        const transaction = yield this.getTransaction(payment.transaction_hash);
                        if (transaction) {
                            callback(transaction);
                        }
                    }
                    catch (error) {
                        console.error(`❌ Stellar payment processing error:`, error.message);
                    }
                });
                eventSource.onerror = (error) => {
                    console.error(`❌ Stellar EventSource error:`, error);
                    eventSource.close();
                };
            }
            catch (error) {
                console.error(`❌ Stellar monitoring error:`, error.message);
            }
        });
    }
    /**
     * Check if account has trustline for asset
     */
    hasTrustline(address, assetCode, assetIssuer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const account = yield this.getAccount(address);
                if (!account) {
                    return false;
                }
                return account.balances.some(b => b.asset_code === assetCode && b.asset_issuer === assetIssuer);
            }
            catch (error) {
                console.error(`❌ Stellar hasTrustline error:`, error.message);
                return false;
            }
        });
    }
    /**
     * Get account's trustlines
     */
    getTrustlines(address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const account = yield this.getAccount(address);
                if (!account) {
                    return [];
                }
                return account.balances
                    .filter(b => b.asset_type !== 'native')
                    .map(b => ({
                    code: b.asset_code,
                    issuer: b.asset_issuer,
                    balance: b.balance,
                    limit: b.limit
                }));
            }
            catch (error) {
                console.error(`❌ Stellar getTrustlines error:`, error.message);
                return [];
            }
        });
    }
    /**
     * Validate Stellar address
     */
    validateAddress(address) {
        // Stellar addresses start with 'G' and are 56 characters long
        return /^G[A-Z2-7]{55}$/.test(address);
    }
    /**
     * Validate memo
     */
    validateMemo(memo, memoType = 'text') {
        switch (memoType) {
            case 'text':
                return memo.length <= 28;
            case 'id':
                return /^\d+$/.test(memo);
            case 'hash':
                return /^[0-9a-fA-F]{64}$/.test(memo);
            default:
                return false;
        }
    }
    /**
     * Get base fee (stroops)
     */
    getBaseFee() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.horizonUrl}/fee_stats`);
                const feeStats = response.data;
                // Return median fee in stroops
                return feeStats.fee_charged.mode || '100';
            }
            catch (error) {
                console.error(`❌ Stellar getBaseFee error:`, error.message);
                return '100'; // Default base fee (100 stroops = 0.00001 XLM)
            }
        });
    }
    /**
     * Submit signed transaction
     */
    submitTransaction(signedTxEnvelope) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield axios_1.default.post(`${this.horizonUrl}/transactions`, `tx=${encodeURIComponent(signedTxEnvelope)}`, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                console.log(`✅ Stellar transaction submitted: ${response.data.hash}`);
                return response.data.hash;
            }
            catch (error) {
                console.error(`❌ Stellar submitTransaction error:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Failed to submit Stellar transaction: ${error.message}`);
            }
        });
    }
    /**
     * Get network info
     */
    getNetworkInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.horizonUrl}/ledgers?order=desc&limit=1`);
                const latestLedger = response.data._embedded.records[0];
                return {
                    ledger: latestLedger.sequence,
                    baseFee: latestLedger.base_fee_in_stroops,
                    baseReserve: latestLedger.base_reserve_in_stroops
                };
            }
            catch (error) {
                console.error(`❌ Stellar getNetworkInfo error:`, error.message);
                throw error;
            }
        });
    }
    /**
     * Get asset info from Stellar.expert
     */
    getAssetInfo(assetCode, assetIssuer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`https://api.stellar.expert/explorer/public/asset/${assetCode}-${assetIssuer}`);
                return response.data;
            }
            catch (error) {
                console.error(`❌ Stellar getAssetInfo error:`, error.message);
                return null;
            }
        });
    }
}
exports.stellarService = new StellarService();
exports.default = exports.stellarService;
