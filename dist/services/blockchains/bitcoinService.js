"use strict";
/**
 * Bitcoin Blockchain Integration Service
 * Handles BTC transactions, address generation, and UTXO management
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
exports.bitcoinService = void 0;
const axios_1 = __importDefault(require("axios"));
class BitcoinService {
    constructor() {
        this.currentEndpointIndex = 0;
        this.rpcEndpoints = [
            process.env.BITCOIN_RPC_URL || 'https://blockstream.info/api',
            'https://blockchain.info',
            'https://btc.getblock.io/mainnet'
        ];
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
        console.log(`🔄 Switched to Bitcoin RPC endpoint: ${this.getRpcEndpoint()}`);
    }
    /**
     * Get Bitcoin address balance
     */
    getAddressBalance(address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const endpoint = this.getRpcEndpoint();
                // Using Blockstream API format
                const response = yield axios_1.default.get(`${endpoint}/address/${address}`);
                const data = response.data;
                const balance = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000; // Convert satoshis to BTC
                const unconfirmed = (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum) / 100000000;
                return {
                    address,
                    balance: balance.toString(),
                    unconfirmedBalance: unconfirmed.toString(),
                    txCount: data.chain_stats.tx_count
                };
            }
            catch (error) {
                console.error(`❌ Bitcoin getAddressBalance error:`, error.message);
                this.switchToNextEndpoint();
                throw new Error(`Failed to get Bitcoin address balance: ${error.message}`);
            }
        });
    }
    /**
     * Get UTXOs for an address
     */
    getAddressUTXOs(address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const endpoint = this.getRpcEndpoint();
                const response = yield axios_1.default.get(`${endpoint}/address/${address}/utxo`);
                return response.data.map((utxo) => {
                    var _a;
                    return ({
                        txid: utxo.txid,
                        vout: utxo.vout,
                        value: utxo.value / 100000000, // Convert to BTC
                        confirmations: ((_a = utxo.status) === null || _a === void 0 ? void 0 : _a.confirmed) ? utxo.status.block_height : 0
                    });
                });
            }
            catch (error) {
                console.error(`❌ Bitcoin getAddressUTXOs error:`, error.message);
                throw new Error(`Failed to get Bitcoin UTXOs: ${error.message}`);
            }
        });
    }
    /**
     * Get transaction details
     */
    getTransaction(txid) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const endpoint = this.getRpcEndpoint();
                const response = yield axios_1.default.get(`${endpoint}/tx/${txid}`);
                const tx = response.data;
                // Extract sender addresses from inputs
                const fromAddresses = tx.vin.map((input) => { var _a; return (_a = input.prevout) === null || _a === void 0 ? void 0 : _a.scriptpubkey_address; }).filter(Boolean);
                // Extract recipient address from outputs
                const toAddress = ((_a = tx.vout[0]) === null || _a === void 0 ? void 0 : _a.scriptpubkey_address) || '';
                // Calculate total output amount
                const amount = tx.vout.reduce((sum, output) => sum + output.value, 0) / 100000000;
                return {
                    txid: tx.txid,
                    from: fromAddresses,
                    to: toAddress,
                    amount: amount.toString(),
                    fee: (tx.fee / 100000000).toString(),
                    confirmations: ((_b = tx.status) === null || _b === void 0 ? void 0 : _b.confirmed) ? tx.status.block_height : 0,
                    blockHeight: (_c = tx.status) === null || _c === void 0 ? void 0 : _c.block_height,
                    timestamp: ((_d = tx.status) === null || _d === void 0 ? void 0 : _d.block_time) || Date.now() / 1000
                };
            }
            catch (error) {
                console.error(`❌ Bitcoin getTransaction error:`, error.message);
                return null;
            }
        });
    }
    /**
     * Monitor address for new transactions
     */
    monitorAddress(address_1, callback_1) {
        return __awaiter(this, arguments, void 0, function* (address, callback, interval = 30000) {
            console.log(`👁️ Monitoring Bitcoin address: ${address}`);
            let lastTxCount = 0;
            const intervalId = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const balance = yield this.getAddressBalance(address);
                    if (balance.txCount > lastTxCount) {
                        console.log(`💰 New Bitcoin transaction detected for ${address}`);
                        // Get recent transactions
                        const endpoint = this.getRpcEndpoint();
                        const txsResponse = yield axios_1.default.get(`${endpoint}/address/${address}/txs`);
                        // Process new transactions
                        const newTxs = txsResponse.data.slice(0, balance.txCount - lastTxCount);
                        for (const tx of newTxs) {
                            const transaction = yield this.getTransaction(tx.txid);
                            if (transaction) {
                                callback(transaction);
                            }
                        }
                        lastTxCount = balance.txCount;
                    }
                }
                catch (error) {
                    console.error(`❌ Bitcoin monitoring error:`, error.message);
                }
            }), interval);
            return intervalId;
        });
    }
    /**
     * Estimate transaction fee
     */
    estimateFee() {
        return __awaiter(this, arguments, void 0, function* (priority = 'medium') {
            try {
                const endpoint = this.getRpcEndpoint();
                const response = yield axios_1.default.get(`${endpoint}/fee-estimates`);
                const feeRates = response.data;
                let targetBlock;
                switch (priority) {
                    case 'low':
                        targetBlock = 144; // ~24 hours
                        break;
                    case 'high':
                        targetBlock = 1; // Next block
                        break;
                    default:
                        targetBlock = 6; // ~1 hour
                }
                const feeRate = feeRates[targetBlock] || feeRates['6'];
                return (feeRate / 100000000).toString(); // Convert to BTC
            }
            catch (error) {
                console.error(`❌ Bitcoin estimateFee error:`, error.message);
                // Return default fees
                return priority === 'high' ? '0.0001' : priority === 'medium' ? '0.00005' : '0.00002';
            }
        });
    }
    /**
     * Broadcast signed transaction
     */
    broadcastTransaction(signedTxHex) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const endpoint = this.getRpcEndpoint();
                const response = yield axios_1.default.post(`${endpoint}/tx`, signedTxHex, {
                    headers: { 'Content-Type': 'text/plain' }
                });
                console.log(`✅ Bitcoin transaction broadcast: ${response.data}`);
                return response.data;
            }
            catch (error) {
                console.error(`❌ Bitcoin broadcastTransaction error:`, error.message);
                throw new Error(`Failed to broadcast Bitcoin transaction: ${error.message}`);
            }
        });
    }
    /**
     * Validate Bitcoin address
     */
    validateAddress(address) {
        // Basic Bitcoin address validation (P2PKH, P2SH, Bech32)
        const p2pkhRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
        const bech32Regex = /^bc1[a-z0-9]{39,59}$/;
        return p2pkhRegex.test(address) || bech32Regex.test(address);
    }
    /**
     * Get network info
     */
    getNetworkInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const endpoint = this.getRpcEndpoint();
                const response = yield axios_1.default.get(`${endpoint}/blocks/tip/height`);
                const blockHeight = response.data;
                return {
                    blockHeight,
                    difficulty: 0, // Would need additional API call
                    hashRate: 'N/A'
                };
            }
            catch (error) {
                console.error(`❌ Bitcoin getNetworkInfo error:`, error.message);
                throw error;
            }
        });
    }
}
exports.bitcoinService = new BitcoinService();
exports.default = exports.bitcoinService;
