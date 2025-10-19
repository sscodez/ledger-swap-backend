"use strict";
/**
 * XDC Network Service
 * Handles XDC (XinFin) blockchain operations
 * Following production-ready patterns for wallet generation, monitoring, and transactions
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
exports.xdcService = void 0;
const ethers_1 = require("ethers");
const web3_1 = __importDefault(require("web3"));
class XDCService {
    constructor() {
        this.currentEndpointIndex = 0;
        this.rpcEndpoints = [
            process.env.XDC_RPC_URL || 'https://rpc.xinfin.network',
            'https://erpc.xinfin.network',
            'https://rpc.xinfin.yodaplus.net'
        ];
        this.explorerUrl = 'https://explorer.xinfin.network';
        this.web3 = new web3_1.default(this.getRpcEndpoint());
        this.provider = new ethers_1.JsonRpcProvider(this.getRpcEndpoint());
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
        this.web3 = new web3_1.default(this.getRpcEndpoint());
        this.provider = new ethers_1.JsonRpcProvider(this.getRpcEndpoint());
        console.log(`🔄 Switched to XDC RPC endpoint: ${this.getRpcEndpoint()}`);
    }
    /**
     * Convert XDC address to Ethereum format (xdc → 0x)
     */
    xdcToEth(address) {
        if (address.toLowerCase().startsWith('xdc')) {
            return '0x' + address.slice(3);
        }
        return address;
    }
    /**
     * Convert Ethereum address to XDC format (0x → xdc)
     */
    ethToXdc(address) {
        if (address.toLowerCase().startsWith('0x')) {
            return 'xdc' + address.slice(2);
        }
        return address;
    }
    /**
     * Generate new XDC address (production-ready)
     * Creates a random wallet and returns XDC-formatted address
     * IMPORTANT: Store privateKey securely (encrypted in DB or vault)
     */
    generateAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            // Generate a new random wallet using ethers.js
            const wallet = ethers_1.Wallet.createRandom();
            // Convert Ethereum-style address to XDC format (xdc prefix instead of 0x)
            const xdcAddress = this.ethToXdc(wallet.address);
            console.log(`✅ Generated new XDC address: ${xdcAddress}`);
            return {
                address: xdcAddress,
                privateKey: wallet.privateKey // MUST be stored encrypted
            };
        });
    }
    /**
     * Get XDC balance
     */
    getBalance(address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ethAddress = this.xdcToEth(address);
                const balanceWei = yield this.web3.eth.getBalance(ethAddress);
                return this.web3.utils.fromWei(balanceWei, 'ether');
            }
            catch (error) {
                console.error(`❌ XDC getBalance error:`, error.message);
                this.switchToNextEndpoint();
                return '0';
            }
        });
    }
    /**
     * Monitor address for deposits (production pattern)
     * Polls blockchain for new transactions to the deposit address
     * @param address - XDC address to monitor
     * @param callback - Function called when deposit detected
     * @param interval - Polling interval in milliseconds (default 15s)
     */
    monitorAddress(address_1, callback_1) {
        return __awaiter(this, arguments, void 0, function* (address, callback, interval = 15000) {
            const ethAddress = this.xdcToEth(address);
            let lastBlock = Number(yield this.web3.eth.getBlockNumber());
            console.log(`🔍 Started monitoring XDC address: ${address} from block ${lastBlock}`);
            const intervalId = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const currentBlock = Number(yield this.web3.eth.getBlockNumber());
                    // Check for new blocks
                    if (currentBlock > lastBlock) {
                        console.log(`📦 Checking XDC blocks ${lastBlock + 1} to ${currentBlock}`);
                        // Scan each new block for transactions
                        for (let i = lastBlock + 1; i <= currentBlock; i++) {
                            const block = yield this.web3.eth.getBlock(i, true);
                            if (block && block.transactions) {
                                for (const tx of block.transactions) {
                                    // Check if transaction is TO our address AND has value
                                    if (tx.to &&
                                        tx.to.toLowerCase() === ethAddress.toLowerCase() &&
                                        tx.value &&
                                        tx.value.toString() !== '0') {
                                        console.log(`💰 XDC deposit detected! TX: ${tx.hash}`);
                                        const transaction = yield this.getTransaction(tx.hash);
                                        if (transaction) {
                                            callback(transaction);
                                        }
                                    }
                                }
                            }
                        }
                        lastBlock = currentBlock;
                    }
                }
                catch (error) {
                    console.error('❌ Error monitoring XDC address:', error);
                }
            }), interval);
            return intervalId;
        });
    }
    /**
     * Get transaction details
     */
    getTransaction(hash) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const tx = yield this.web3.eth.getTransaction(hash);
                if (!tx) {
                    return null;
                }
                const receipt = yield this.web3.eth.getTransactionReceipt(hash);
                const resolvedBlockNumber = tx.blockNumber != null ? Number(tx.blockNumber) : Number(yield this.web3.eth.getBlockNumber());
                const block = yield this.web3.eth.getBlock(resolvedBlockNumber);
                const normalizedBlockNumber = Number((_a = tx.blockNumber) !== null && _a !== void 0 ? _a : block.number);
                const statusVal = receipt === null || receipt === void 0 ? void 0 : receipt.status;
                const success = (() => {
                    if (typeof statusVal === 'boolean')
                        return statusVal;
                    if (typeof statusVal === 'number')
                        return statusVal === 1;
                    if (typeof statusVal === 'string')
                        return statusVal === '0x1' || statusVal === '1';
                    if (typeof statusVal === 'bigint')
                        return String(statusVal) === '1';
                    return false;
                })();
                return {
                    hash: tx.hash,
                    from: this.ethToXdc(tx.from),
                    to: this.ethToXdc(tx.to || ''),
                    value: this.web3.utils.fromWei(tx.value.toString(), 'ether'),
                    gas: tx.gas.toString(),
                    gasPrice: this.web3.utils.fromWei(tx.gasPrice.toString(), 'gwei'),
                    blockNumber: normalizedBlockNumber,
                    timestamp: Number(block.timestamp),
                    status: success
                };
            }
            catch (error) {
                console.error(`❌ XDC getTransaction error:`, error.message);
                return null;
            }
        });
    }
    /**
     * Send XDC transaction (production pattern)
     * Signs and broadcasts transaction to send XDC to recipient
     * @param privateKey - Sender's private key (from secure storage)
     * @param toAddress - Recipient XDC address
     * @param amount - Amount in XDC (as string)
     * @returns Transaction hash
     */
    sendTransaction(privateKey, toAddress, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            // Create wallet from private key
            const wallet = new ethers_1.Wallet(privateKey, this.provider);
            const ethToAddress = this.xdcToEth(toAddress);
            console.log(`📤 Sending ${amount} XDC to ${toAddress}...`);
            // Send transaction
            const tx = yield wallet.sendTransaction({
                to: ethToAddress,
                value: (0, ethers_1.parseEther)(amount)
            });
            console.log(`✅ XDC transaction sent! Hash: ${tx.hash}`);
            console.log(`⏳ Waiting for confirmation...`);
            // Wait for transaction to be mined
            yield tx.wait();
            console.log(`✅ XDC transaction confirmed in block`);
            return tx.hash;
        });
    }
    /**
     * Validate XDC address
     */
    validateAddress(address) {
        // XDC addresses start with 'xdc' or '0x' and are 42 characters
        const xdcPattern = /^xdc[a-fA-F0-9]{40}$/;
        const ethPattern = /^0x[a-fA-F0-9]{40}$/;
        return xdcPattern.test(address) || ethPattern.test(address);
    }
    /**
     * Get current gas price
     */
    getGasPrice() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const gasPrice = yield this.web3.eth.getGasPrice();
                return this.web3.utils.fromWei(gasPrice.toString(), 'gwei');
            }
            catch (error) {
                console.error(`❌ XDC getGasPrice error:`, error.message);
                return '1'; // Default 1 gwei
            }
        });
    }
    /**
     * Send signed transaction
     */
    sendSignedTransaction(signedTx) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const receipt = yield this.web3.eth.sendSignedTransaction(signedTx);
                const txHash = typeof receipt.transactionHash === 'string'
                    ? receipt.transactionHash
                    : this.web3.utils.bytesToHex(receipt.transactionHash);
                console.log(`✅ XDC transaction sent: ${txHash}`);
                return txHash;
            }
            catch (error) {
                console.error(`❌ XDC sendSignedTransaction error:`, error.message);
                throw new Error(`Failed to send XDC transaction: ${error.message}`);
            }
        });
    }
    /**
     * Get network info
     */
    getNetworkInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [blockNumber, chainId, gasPrice] = yield Promise.all([
                    this.web3.eth.getBlockNumber(),
                    this.web3.eth.getChainId(),
                    this.getGasPrice()
                ]);
                return {
                    blockNumber: Number(blockNumber),
                    chainId: Number(chainId),
                    gasPrice
                };
            }
            catch (error) {
                console.error(`❌ XDC getNetworkInfo error:`, error.message);
                throw error;
            }
        });
    }
    /**
     * Get account nonce
     */
    getNonce(address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ethAddress = this.xdcToEth(address);
                const nonce = yield this.web3.eth.getTransactionCount(ethAddress);
                return Number(nonce);
            }
            catch (error) {
                console.error(`❌ XDC getNonce error:`, error.message);
                return 0;
            }
        });
    }
}
exports.xdcService = new XDCService();
exports.default = exports.xdcService;
