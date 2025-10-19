"use strict";
/**
 * XRP Ledger Integration Service
 * Handles XRP transactions, trustlines, and account management
 * Following production-ready patterns with xrpl.js SDK
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
exports.xrpService = void 0;
const axios_1 = __importDefault(require("axios"));
const xrpl_1 = require("xrpl");
class XRPService {
    constructor() {
        this.currentEndpointIndex = 0;
        this.rpcEndpoints = [
            process.env.XRP_RPC_URL || 'https://s1.ripple.com:51234',
            'https://s2.ripple.com:51234',
            'https://xrplcluster.com'
        ];
        this.wsEndpoint = process.env.XRP_WS_URL || 'wss://xrplcluster.com';
    }
    /**
     * Generate new XRP wallet (production-ready)
     * Creates a new keypair and returns address and seed
     * IMPORTANT: Store seed securely (encrypted in DB or vault)
     */
    generateAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            // Generate new wallet with xrpl.js
            const wallet = xrpl_1.Wallet.generate();
            console.log(`✅ Generated new XRP address: ${wallet.classicAddress}`);
            return {
                address: wallet.classicAddress,
                seed: wallet.seed // MUST be stored encrypted
            };
        });
    }
    /**
     * Send XRP payment (production pattern)
     * Signs and submits payment transaction
     * @param senderSeed - Wallet seed (from secure storage)
     * @param toAddress - Recipient XRP address
     * @param amount - Amount in XRP (as string)
     * @param destinationTag - Optional destination tag
     * @returns Transaction hash
     */
    sendTransaction(senderSeed, toAddress, amount, destinationTag) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = new xrpl_1.Client(this.wsEndpoint);
            try {
                yield client.connect();
                console.log(`📤 Sending ${amount} XRP to ${toAddress}...`);
                // Create wallet from seed
                const wallet = xrpl_1.Wallet.fromSeed(senderSeed);
                // Prepare payment transaction
                const payment = {
                    TransactionType: 'Payment',
                    Account: wallet.address,
                    Destination: toAddress,
                    Amount: (0, xrpl_1.xrpToDrops)(amount)
                };
                // Add destination tag if provided
                if (destinationTag !== undefined) {
                    payment.DestinationTag = destinationTag;
                }
                // Autofill (adds fee, sequence, etc.)
                const prepared = yield client.autofill(payment);
                // Sign transaction
                const signed = wallet.sign(prepared);
                // Submit and wait for validation
                const result = yield client.submitAndWait(signed.tx_blob);
                console.log(`✅ XRP payment successful! Hash: ${result.result.hash}`);
                yield client.disconnect();
                return result.result.hash;
            }
            catch (error) {
                console.error('❌ XRP send transaction error:', error);
                yield client.disconnect();
                throw new Error(`Failed to send XRP: ${error.message}`);
            }
        });
    }
    /**
     * Get current RPC endpoint with failover
     */
    getRpcEndpoint() {
        return this.rpcEndpoints[this.currentEndpointIndex];
    }
    /**
     * Switch to next RPC endpoint on failure
     */
    switchToNextEndpoint() {
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.rpcEndpoints.length;
        console.log(`🔄 Switched to XRP RPC endpoint: ${this.getRpcEndpoint()}`);
    }
    /**
     * Make JSON-RPC request to XRP Ledger
     */
    rpcRequest(method_1) {
        return __awaiter(this, arguments, void 0, function* (method, params = []) {
            var _a;
            try {
                const endpoint = this.getRpcEndpoint();
                const response = yield axios_1.default.post(endpoint, {
                    method,
                    params
                }, {
                    headers: { 'Content-Type': 'application/json' }
                });
                if (((_a = response.data.result) === null || _a === void 0 ? void 0 : _a.status) === 'error') {
                    throw new Error(response.data.result.error_message || 'XRP RPC error');
                }
                return response.data.result;
            }
            catch (error) {
                console.error(`❌ XRP RPC error (${method}):`, error.message);
                this.switchToNextEndpoint();
                throw error;
            }
        });
    }
    /**
     * Get XRP account info
     */
    getAccount(address) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const result = yield this.rpcRequest('account_info', [{
                        account: address,
                        ledger_index: 'validated'
                    }]);
                const accountData = result.account_data;
                return {
                    address: accountData.Account,
                    balance: accountData.Balance, // XRP in drops (1 XRP = 1,000,000 drops)
                    sequence: accountData.Sequence,
                    ownerCount: accountData.OwnerCount,
                    previousTxnID: accountData.PreviousTxnID
                };
            }
            catch (error) {
                if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('actNotFound')) {
                    console.log(`ℹ️ XRP account not found: ${address}`);
                    return null;
                }
                console.error(`❌ XRP getAccount error:`, error.message);
                throw new Error(`Failed to get XRP account: ${error.message}`);
            }
        });
    }
    /**
     * Get XRP balance (in XRP, not drops)
     */
    getBalance(address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const account = yield this.getAccount(address);
                if (!account) {
                    return '0';
                }
                // Convert drops to XRP
                const xrpBalance = parseInt(account.balance) / 1000000;
                return xrpBalance.toString();
            }
            catch (error) {
                console.error(`❌ XRP getBalance error:`, error.message);
                return '0';
            }
        });
    }
    /**
     * Get account trustlines (issued currencies)
     */
    getTrustlines(address, currency, issuer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.rpcRequest('account_lines', [{
                        account: address,
                        ledger_index: 'validated'
                    }]);
                let lines = result.lines || [];
                // Filter by currency and/or issuer if specified
                if (currency) {
                    lines = lines.filter((line) => line.currency === currency);
                }
                if (issuer) {
                    lines = lines.filter((line) => line.account === issuer);
                }
                return lines.map((line) => ({
                    currency: line.currency,
                    issuer: line.account,
                    balance: line.balance,
                    limit: line.limit,
                    quality_in: line.quality_in || 0,
                    quality_out: line.quality_out || 0
                }));
            }
            catch (error) {
                console.error(`❌ XRP getTrustlines error:`, error.message);
                return [];
            }
        });
    }
    /**
     * Get transaction details
     */
    getTransaction(hash) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.rpcRequest('tx', [{
                        transaction: hash,
                        binary: false
                    }]);
                const tx = result;
                // Extract amount information
                let amount = '0';
                let currency = 'XRP';
                let issuer;
                if (typeof tx.Amount === 'string') {
                    // XRP amount in drops
                    amount = (parseInt(tx.Amount) / 1000000).toString();
                }
                else if (typeof tx.Amount === 'object') {
                    // Issued currency
                    amount = tx.Amount.value;
                    currency = tx.Amount.currency;
                    issuer = tx.Amount.issuer;
                }
                return {
                    hash: tx.hash,
                    from: tx.Account,
                    to: tx.Destination || '',
                    amount,
                    currency,
                    issuer,
                    destinationTag: tx.DestinationTag,
                    fee: (parseInt(tx.Fee) / 1000000).toString(), // Convert drops to XRP
                    ledgerIndex: tx.ledger_index,
                    timestamp: this.rippleTimeToUnix(tx.date),
                    validated: tx.validated || false
                };
            }
            catch (error) {
                console.error(`❌ XRP getTransaction error:`, error.message);
                return null;
            }
        });
    }
    /**
     * Monitor address for new transactions
     */
    monitorAddress(address_1, callback_1) {
        return __awaiter(this, arguments, void 0, function* (address, callback, interval = 5000 // XRP ledgers close every ~3-5 seconds
        ) {
            console.log(`👁️ Monitoring XRP address: ${address}`);
            let lastLedgerIndex = 0;
            const intervalId = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const result = yield this.rpcRequest('account_tx', [{
                            account: address,
                            ledger_index_min: lastLedgerIndex || -1,
                            ledger_index_max: -1,
                            limit: 10
                        }]);
                    const transactions = result.transactions || [];
                    for (const txWrapper of transactions) {
                        const tx = txWrapper.tx;
                        // Only process incoming payments
                        if (tx.TransactionType === 'Payment' && tx.Destination === address) {
                            const ledgerIndex = tx.ledger_index;
                            if (ledgerIndex > lastLedgerIndex) {
                                console.log(`💰 New XRP payment detected: ${tx.hash}`);
                                const transaction = yield this.getTransaction(tx.hash);
                                if (transaction) {
                                    callback(transaction);
                                }
                            }
                        }
                    }
                    // Update last processed ledger
                    if (transactions.length > 0) {
                        lastLedgerIndex = Math.max(...transactions.map((t) => t.tx.ledger_index));
                    }
                }
                catch (error) {
                    console.error(`❌ XRP monitoring error:`, error.message);
                }
            }), interval);
            return intervalId;
        });
    }
    /**
     * Check if account has trustline for currency
     */
    hasTrustline(address, currency, issuer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const trustlines = yield this.getTrustlines(address, currency, issuer);
                return trustlines.length > 0;
            }
            catch (error) {
                console.error(`❌ XRP hasTrustline error:`, error.message);
                return false;
            }
        });
    }
    /**
     * Validate XRP address
     */
    validateAddress(address) {
        // XRP addresses start with 'r' and are typically 25-35 characters
        return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address);
    }
    /**
     * Validate destination tag
     */
    validateDestinationTag(tag) {
        return Number.isInteger(tag) && tag >= 0 && tag <= 4294967295;
    }
    /**
     * Get current transaction fee
     */
    getFee() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const result = yield this.rpcRequest('fee', []);
                // Returns fee in drops, convert to XRP
                const feeInDrops = ((_a = result.drops) === null || _a === void 0 ? void 0 : _a.open_ledger_fee) || '10';
                return (parseInt(feeInDrops) / 1000000).toString();
            }
            catch (error) {
                console.error(`❌ XRP getFee error:`, error.message);
                return '0.00001'; // Default fee: 10 drops = 0.00001 XRP
            }
        });
    }
    /**
     * Submit signed transaction
     */
    submitTransaction(signedTxBlob) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.rpcRequest('submit', [{
                        tx_blob: signedTxBlob
                    }]);
                if (result.engine_result !== 'tesSUCCESS') {
                    throw new Error(`Transaction failed: ${result.engine_result_message}`);
                }
                console.log(`✅ XRP transaction submitted: ${result.tx_json.hash}`);
                return result.tx_json.hash;
            }
            catch (error) {
                console.error(`❌ XRP submitTransaction error:`, error.message);
                throw new Error(`Failed to submit XRP transaction: ${error.message}`);
            }
        });
    }
    /**
     * Get ledger info
     */
    getLedgerInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.rpcRequest('ledger', [{
                        ledger_index: 'validated'
                    }]);
                const ledger = result.ledger;
                return {
                    ledgerIndex: ledger.ledger_index,
                    ledgerHash: ledger.ledger_hash,
                    closeTime: this.rippleTimeToUnix(ledger.close_time),
                    validated: result.validated || false
                };
            }
            catch (error) {
                console.error(`❌ XRP getLedgerInfo error:`, error.message);
                throw error;
            }
        });
    }
    /**
     * Convert Ripple time to Unix timestamp
     */
    rippleTimeToUnix(rippleTime) {
        // Ripple epoch starts at January 1, 2000 (946684800 seconds after Unix epoch)
        const unixTime = rippleTime + 946684800;
        return new Date(unixTime * 1000).toISOString();
    }
    /**
     * Check if account is activated (has minimum reserve)
     */
    isAccountActivated(address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const account = yield this.getAccount(address);
                return account !== null;
            }
            catch (error) {
                return false;
            }
        });
    }
    /**
     * Get minimum account reserve
     */
    getReserveRequirement() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const result = yield this.rpcRequest('server_state', []);
                const baseReserve = ((_a = result.state.validated_ledger) === null || _a === void 0 ? void 0 : _a.reserve_base_xrp) || 10;
                const ownerReserve = ((_b = result.state.validated_ledger) === null || _b === void 0 ? void 0 : _b.reserve_inc_xrp) || 2;
                return {
                    baseReserve: baseReserve.toString(),
                    ownerReserve: ownerReserve.toString()
                };
            }
            catch (error) {
                console.error(`❌ XRP getReserveRequirement error:`, error.message);
                return {
                    baseReserve: '10',
                    ownerReserve: '2'
                };
            }
        });
    }
}
exports.xrpService = new XRPService();
exports.default = exports.xrpService;
