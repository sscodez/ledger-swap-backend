"use strict";
/**
 * Stellar (XLM) Blockchain Integration Service
 * Handles Stellar transactions, assets, and trustlines
 * Following production-ready patterns with stellar-sdk
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
const StellarSdk = require('stellar-sdk');
const Keypair = StellarSdk.Keypair;
const Server = StellarSdk.Server;
const Asset = StellarSdk.Asset;
const TransactionBuilder = StellarSdk.TransactionBuilder;
const Operation = StellarSdk.Operation;
const Networks = StellarSdk.Networks;
const Memo = StellarSdk.Memo;
class StellarService {
    constructor() {
        this.horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon.stellar.org';
        this.server = new Server(this.horizonUrl);
        this.networkPassphrase = Networks.PUBLIC; // or Networks.TESTNET
    }
    /**
     * Generate new Stellar keypair (production-ready)
     * Creates a new random keypair and returns public key and secret
     * IMPORTANT: Store secret securely (encrypted in DB or vault)
     */
    generateAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            // Generate new keypair with stellar-sdk
            const keypair = Keypair.random();
            console.log(`✅ Generated new XLM address: ${keypair.publicKey()}`);
            // Note: New accounts need funding (min 1 XLM) before they're active on mainnet
            // On testnet: await fetch(`https://friendbot.stellar.org?addr=${keypair.publicKey()}`);
            return {
                address: keypair.publicKey(),
                secret: keypair.secret() // MUST be stored encrypted
            };
        });
    }
    /**
     * Send XLM payment (production pattern)
     * Signs and submits payment transaction to Stellar network
     * @param senderSecret - Secret key (from secure storage)
     * @param toAddress - Recipient Stellar address
     * @param amount - Amount in XLM (as string)
     * @param asset - Asset to send (default: native XLM)
     * @param memo - Optional memo text
     * @returns Transaction hash
     */
    sendTransaction(senderSecret_1, toAddress_1, amount_1) {
        return __awaiter(this, arguments, void 0, function* (senderSecret, toAddress, amount, asset = null, // Stellar Asset
        memo) {
            const assetToUse = asset || Asset.native();
            try {
                const sourceKeypair = Keypair.fromSecret(senderSecret);
                console.log(`📤 Sending ${amount} XLM to ${toAddress}...`);
                // Load source account
                const account = yield this.server.loadAccount(sourceKeypair.publicKey());
                // Get base fee from network
                const fee = yield this.server.fetchBaseFee();
                // Build transaction
                let txBuilder = new TransactionBuilder(account, {
                    fee: fee.toString(),
                    networkPassphrase: this.networkPassphrase
                })
                    .addOperation(Operation.payment({
                    destination: toAddress,
                    asset: assetToUse,
                    amount: amount
                }))
                    .setTimeout(30);
                // Add memo if provided
                if (memo) {
                    txBuilder = txBuilder.addMemo(Memo.text(memo));
                }
                const transaction = txBuilder.build();
                // Sign transaction
                transaction.sign(sourceKeypair);
                // Submit to network
                const result = yield this.server.submitTransaction(transaction);
                console.log(`✅ XLM payment successful! Hash: ${result.hash}`);
                return result.hash;
            }
            catch (error) {
                console.error('❌ Stellar send transaction error:', error);
                throw new Error(`Failed to send XLM: ${error.message}`);
            }
        });
    }
    /**
     * Get Stellar account info (using stellar-sdk Server)
     */
    getAccount(address) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const account = yield this.server.loadAccount(address);
                return {
                    address: account.accountId(),
                    sequence: account.sequence,
                    balances: account.balances,
                    subentryCount: account.subentries
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
                const tx = yield this.server.transactions().transaction(hash).call();
                const operations = yield this.server.operations().forTransaction(hash).call();
                // Find payment operation
                const paymentOp = operations.records.find((op) => op.type === 'payment' || op.type === 'path_payment_strict_send');
                if (!paymentOp) {
                    return null;
                }
                return {
                    hash: tx.hash,
                    from: (paymentOp === null || paymentOp === void 0 ? void 0 : paymentOp.from) || tx.source_account,
                    to: (paymentOp === null || paymentOp === void 0 ? void 0 : paymentOp.to) || '',
                    amount: (paymentOp === null || paymentOp === void 0 ? void 0 : paymentOp.amount) || '0',
                    asset: {
                        code: (paymentOp === null || paymentOp === void 0 ? void 0 : paymentOp.asset_type) === 'native' ? 'XLM' : (paymentOp === null || paymentOp === void 0 ? void 0 : paymentOp.asset_code) || 'XLM',
                        issuer: paymentOp === null || paymentOp === void 0 ? void 0 : paymentOp.asset_issuer
                    },
                    memo: tx.memo || '',
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
                // Use Stellar SDK's streaming API
                this.server.payments()
                    .forAccount(address)
                    .cursor('now')
                    .stream({
                    onmessage: (payment) => __awaiter(this, void 0, void 0, function* () {
                        try {
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
                    }),
                    onerror: (error) => {
                        console.error(`❌ Stellar stream error:`, error);
                    }
                });
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
     * Get base fee (stroops) - using server method
     */
    getBaseFee() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fee = yield this.server.fetchBaseFee();
                return fee.toString();
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
