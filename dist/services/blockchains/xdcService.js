"use strict";
/**
 * XDC Network (XinFin) Integration Service
 * Handles XDC transactions and XRC20 tokens
 * XDC is EVM-compatible with some differences in address format
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
     * Get XRC20 token balance
     */
    getTokenBalance(tokenAddress, holderAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tokenEthAddress = this.xdcToEth(tokenAddress);
                const holderEthAddress = this.xdcToEth(holderAddress);
                // ERC20 balanceOf function ABI
                const minABI = [
                    {
                        constant: true,
                        inputs: [{ name: '_owner', type: 'address' }],
                        name: 'balanceOf',
                        outputs: [{ name: 'balance', type: 'uint256' }],
                        type: 'function'
                    },
                    {
                        constant: true,
                        inputs: [],
                        name: 'decimals',
                        outputs: [{ name: '', type: 'uint8' }],
                        type: 'function'
                    }
                ];
                const contract = new this.web3.eth.Contract(minABI, tokenEthAddress);
                const balance = yield contract.methods.balanceOf(holderEthAddress).call();
                const decimals = yield contract.methods.decimals().call();
                return this.web3.utils.fromWei(balance.toString(), 'ether');
            }
            catch (error) {
                console.error(`❌ XDC getTokenBalance error:`, error.message);
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
                const tx = yield this.web3.eth.getTransaction(hash);
                if (!tx) {
                    return null;
                }
                const receipt = yield this.web3.eth.getTransactionReceipt(hash);
                const block = yield this.web3.eth.getBlock(tx.blockNumber);
                return {
                    hash: tx.hash,
                    from: this.ethToXdc(tx.from),
                    to: this.ethToXdc(tx.to || ''),
                    value: this.web3.utils.fromWei(tx.value.toString(), 'ether'),
                    gas: tx.gas.toString(),
                    gasPrice: this.web3.utils.fromWei(tx.gasPrice.toString(), 'gwei'),
                    blockNumber: tx.blockNumber,
                    timestamp: Number(block.timestamp),
                    status: (receipt === null || receipt === void 0 ? void 0 : receipt.status) || false
                };
            }
            catch (error) {
                console.error(`❌ XDC getTransaction error:`, error.message);
                return null;
            }
        });
    }
    /**
     * Monitor address for new transactions
     */
    monitorAddress(address_1, callback_1) {
        return __awaiter(this, arguments, void 0, function* (address, callback, interval = 15000 // XDC block time ~2 seconds, check every 15s
        ) {
            console.log(`👁️ Monitoring XDC address: ${address}`);
            const ethAddress = this.xdcToEth(address);
            let lastBlock = yield this.web3.eth.getBlockNumber();
            const intervalId = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const currentBlock = yield this.web3.eth.getBlockNumber();
                    if (currentBlock > lastBlock) {
                        // Check blocks for transactions to this address
                        for (let i = lastBlock + 1; i <= currentBlock; i++) {
                            const block = yield this.web3.eth.getBlock(i, true);
                            if (block && block.transactions) {
                                for (const tx of block.transactions) {
                                    if (tx.to && tx.to.toLowerCase() === ethAddress.toLowerCase() && tx.value && tx.value.toString() !== '0') {
                                        console.log(`💰 New XDC transaction detected: ${tx.hash}`);
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
                    console.error(`❌ XDC monitoring error:`, error.message);
                }
            }), interval);
            return intervalId;
        });
    }
    /**
     * Monitor XRC20 token transfers
     */
    monitorTokenTransfers(tokenAddress_1, recipientAddress_1, callback_1) {
        return __awaiter(this, arguments, void 0, function* (tokenAddress, recipientAddress, callback, interval = 15000) {
            console.log(`👁️ Monitoring XRC20 token ${tokenAddress} for ${recipientAddress}`);
            const tokenEthAddress = this.xdcToEth(tokenAddress);
            const recipientEthAddress = this.xdcToEth(recipientAddress);
            // Transfer event signature
            const transferEventSignature = this.web3.utils.sha3('Transfer(address,address,uint256)');
            let lastBlock = yield this.web3.eth.getBlockNumber();
            const intervalId = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const currentBlock = yield this.web3.eth.getBlockNumber();
                    if (currentBlock > lastBlock) {
                        const logs = yield this.web3.eth.getPastLogs({
                            fromBlock: lastBlock + 1,
                            toBlock: currentBlock,
                            address: tokenEthAddress,
                            topics: [
                                transferEventSignature,
                                null,
                                this.web3.utils.padLeft(recipientEthAddress, 64)
                            ]
                        });
                        for (const log of logs) {
                            console.log(`💰 New XRC20 transfer detected`);
                            callback(log);
                        }
                        lastBlock = currentBlock;
                    }
                }
                catch (error) {
                    console.error(`❌ XDC token monitoring error:`, error.message);
                }
            }), interval);
            return intervalId;
        });
    }
    /**
     * Get XRC20 token info
     */
    getTokenInfo(tokenAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tokenEthAddress = this.xdcToEth(tokenAddress);
                const minABI = [
                    {
                        constant: true,
                        inputs: [],
                        name: 'name',
                        outputs: [{ name: '', type: 'string' }],
                        type: 'function'
                    },
                    {
                        constant: true,
                        inputs: [],
                        name: 'symbol',
                        outputs: [{ name: '', type: 'string' }],
                        type: 'function'
                    },
                    {
                        constant: true,
                        inputs: [],
                        name: 'decimals',
                        outputs: [{ name: '', type: 'uint8' }],
                        type: 'function'
                    },
                    {
                        constant: true,
                        inputs: [],
                        name: 'totalSupply',
                        outputs: [{ name: '', type: 'uint256' }],
                        type: 'function'
                    }
                ];
                const contract = new this.web3.eth.Contract(minABI, tokenEthAddress);
                const [name, symbol, decimals, totalSupply] = yield Promise.all([
                    contract.methods.name().call(),
                    contract.methods.symbol().call(),
                    contract.methods.decimals().call(),
                    contract.methods.totalSupply().call()
                ]);
                return {
                    address: this.ethToXdc(tokenEthAddress),
                    name: name,
                    symbol: symbol,
                    decimals: Number(decimals),
                    totalSupply: totalSupply.toString()
                };
            }
            catch (error) {
                console.error(`❌ XDC getTokenInfo error:`, error.message);
                return null;
            }
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
     * Estimate gas for transaction
     */
    estimateGas(from, to, value) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ethFrom = this.xdcToEth(from);
                const ethTo = this.xdcToEth(to);
                const valueWei = this.web3.utils.toWei(value, 'ether');
                const gasEstimate = yield this.web3.eth.estimateGas({
                    from: ethFrom,
                    to: ethTo,
                    value: valueWei
                });
                return gasEstimate.toString();
            }
            catch (error) {
                console.error(`❌ XDC estimateGas error:`, error.message);
                return '21000'; // Default gas limit for simple transfer
            }
        });
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
                console.log(`✅ XDC transaction sent: ${receipt.transactionHash}`);
                return receipt.transactionHash;
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
                return nonce;
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
