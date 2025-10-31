"use strict";
/**
 * Bitcoin Blockchain Integration Service
 * Handles BTC transactions, address generation, and UTXO management
 * Following production-ready patterns with bitcoinjs-lib
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecpair_1 = require("ecpair");
const tinysecp = __importStar(require("tiny-secp256k1"));
const ECPair = (0, ecpair_1.ECPairFactory)(tinysecp);
class BitcoinService {
    constructor() {
        this.currentEndpointIndex = 0;
        this.rpcEndpoints = [
            process.env.BITCOIN_RPC_URL || 'https://blockstream.info/api',
            'https://blockchain.info',
            'https://btc.getblock.io/mainnet'
        ];
        // Set network (mainnet or testnet)
        this.network = process.env.BTC_NETWORK === 'testnet'
            ? bitcoin.networks.testnet
            : bitcoin.networks.bitcoin;
    }
    /**
     * Build an unsigned PSBT for a payment from fromAddress to toAddress.
     * Returns base64 PSBT and metadata for the client to sign and submit back.
     */
    buildUnsignedPsbt(fromAddress_1, toAddress_1, amountBTC_1) {
        return __awaiter(this, arguments, void 0, function* (fromAddress, toAddress, amountBTC, feeRate = 10) {
            try {
                const utxos = yield this.getUTXOs(fromAddress);
                if (!utxos.length)
                    throw new Error('No UTXOs available for spending');
                const satoshiAmount = Math.floor(amountBTC * 1e8);
                // Select UTXOs greedily until we cover amount + rough fee
                const sorted = [...utxos].sort((a, b) => b.value - a.value);
                const selected = [];
                let inputSum = 0;
                // Initial rough fee assuming 1 input, 2 outputs
                const roughSize = (inputs, outputs) => 10 + inputs * 148 + outputs * 34; // bytes
                let estFee = Math.ceil(feeRate * roughSize(1, 2));
                for (const utxo of sorted) {
                    selected.push(utxo);
                    inputSum += utxo.value;
                    estFee = Math.ceil(feeRate * roughSize(selected.length, 2));
                    if (inputSum >= satoshiAmount + estFee)
                        break;
                }
                if (inputSum < satoshiAmount + estFee) {
                    throw new Error('Insufficient balance for amount + fee');
                }
                const change = inputSum - satoshiAmount - estFee;
                const psbt = new bitcoin.Psbt({ network: this.network });
                // Add inputs with full previous tx (nonWitnessUtxo) for broad compatibility
                for (const utxo of selected) {
                    const txHex = yield this.getRawTransaction(utxo.txid);
                    psbt.addInput({
                        hash: utxo.txid,
                        index: utxo.vout,
                        nonWitnessUtxo: Buffer.from(txHex, 'hex'),
                    });
                }
                // Output to recipient
                psbt.addOutput({ address: toAddress, value: satoshiAmount });
                // Change output back to sender if above dust
                if (change > 546) {
                    psbt.addOutput({ address: fromAddress, value: change });
                }
                return {
                    psbtBase64: psbt.toBase64(),
                    inputs: selected.length,
                    changeSat: Math.max(change, 0),
                    network: this.network === bitcoin.networks.testnet ? 'testnet' : 'mainnet',
                };
            }
            catch (error) {
                console.error('❌ buildUnsignedPsbt error:', error);
                throw new Error((error === null || error === void 0 ? void 0 : error.message) || 'Failed to build PSBT');
            }
        });
    }
    /**
     * Finalize a signed PSBT (from wallet) and broadcast it to the network.
     */
    finalizeAndBroadcastSignedPsbt(signedPsbtBase64) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const psbt = bitcoin.Psbt.fromBase64(signedPsbtBase64, { network: this.network });
                try {
                    psbt.finalizeAllInputs();
                }
                catch (e) {
                    // If already finalized, ignore
                }
                const txHex = psbt.extractTransaction().toHex();
                const txid = yield this.broadcastTransaction(txHex);
                return txid;
            }
            catch (error) {
                console.error('❌ finalizeAndBroadcastSignedPsbt error:', error);
                throw new Error((error === null || error === void 0 ? void 0 : error.message) || 'Failed to broadcast PSBT');
            }
        });
    }
    /**
     * Generate new Bitcoin address (production-ready)
     * Creates a random keypair and returns P2WPKH (native SegWit) address
     * IMPORTANT: Store privateKeyWIF securely (encrypted in DB or vault)
     */
    generateAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            // Generate random keypair
            const keyPair = ECPair.makeRandom({ network: this.network });
            // Generate P2WPKH (native SegWit) address - bc1q... format
            const { address } = bitcoin.payments.p2wpkh({
                pubkey: keyPair.publicKey,
                network: this.network
            });
            console.log(`✅ Generated new BTC address: ${address}`);
            return {
                address: address,
                privateKeyWIF: keyPair.toWIF() // MUST be stored encrypted
            };
        });
    }
    /**
     * Send Bitcoin transaction (production pattern)
     * Builds, signs, and broadcasts BTC transaction
     * @param privateKeyWIF - Private key in WIF format (from secure storage)
     * @param toAddress - Recipient Bitcoin address
     * @param amountBTC - Amount in BTC (as number)
     * @param feeRate - Fee rate in satoshis per byte (default: 10)
     * @returns Transaction ID
     */
    sendTransaction(privateKeyWIF_1, toAddress_1, amountBTC_1) {
        return __awaiter(this, arguments, void 0, function* (privateKeyWIF, toAddress, amountBTC, feeRate = 10) {
            try {
                console.log(`📤 Sending ${amountBTC} BTC to ${toAddress}...`);
                const keyPair = ECPair.fromWIF(privateKeyWIF, this.network);
                const { address: fromAddress } = bitcoin.payments.p2wpkh({
                    pubkey: keyPair.publicKey,
                    network: this.network
                });
                // Get UTXOs for the from address
                const utxos = yield this.getUTXOs(fromAddress);
                if (utxos.length === 0) {
                    throw new Error('No UTXOs available for spending');
                }
                // Build transaction with PSBT
                const psbt = new bitcoin.Psbt({ network: this.network });
                let inputSum = 0;
                for (const utxo of utxos) {
                    // Get full transaction for each UTXO
                    const txHex = yield this.getRawTransaction(utxo.txid);
                    psbt.addInput({
                        hash: utxo.txid,
                        index: utxo.vout,
                        nonWitnessUtxo: Buffer.from(txHex, 'hex')
                    });
                    inputSum += utxo.value;
                }
                const satoshiAmount = Math.floor(amountBTC * 100000000);
                const estimatedFee = feeRate * 250; // Rough estimate for 1-input, 2-output tx
                const change = inputSum - satoshiAmount - estimatedFee;
                // Add output to recipient
                psbt.addOutput({
                    address: toAddress,
                    value: satoshiAmount
                });
                // Add change output if significant
                if (change > 1000) {
                    psbt.addOutput({
                        address: fromAddress,
                        value: change
                    });
                }
                // Sign all inputs
                psbt.signAllInputs(keyPair);
                psbt.finalizeAllInputs();
                // Extract and broadcast
                const tx = psbt.extractTransaction();
                const txHex = tx.toHex();
                const txid = yield this.broadcastTransaction(txHex);
                console.log(`✅ BTC transaction sent! TXID: ${txid}`);
                return txid;
            }
            catch (error) {
                console.error('❌ Bitcoin send transaction error:', error);
                throw new Error(`Failed to send BTC: ${error.message}`);
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
     * Get UTXOs formatted for PSBT consumption (values in satoshis)
     */
    getUTXOs(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const utxos = yield this.getAddressUTXOs(address);
            // Convert BTC values to satoshis
            return utxos.map((u) => ({
                txid: u.txid,
                vout: u.vout,
                value: Math.floor(u.value * 1e8),
            }));
        });
    }
    /**
     * Get raw transaction hex for an existing transaction (for nonWitnessUtxo)
     */
    getRawTransaction(txid) {
        return __awaiter(this, void 0, void 0, function* () {
            const endpoint = this.getRpcEndpoint();
            const { data } = yield axios_1.default.get(`${endpoint}/tx/${txid}/hex`);
            return data; // hex string
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
