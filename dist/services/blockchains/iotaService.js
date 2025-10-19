"use strict";
/**
 * IOTA (Shimmer/IOTA 2.0) Integration Service
 * Handles IOTA transactions and native tokens on the Tangle
 * Note: IOTA uses a DAG (Directed Acyclic Graph) instead of blockchain
 * Following production-ready patterns with @iota/sdk
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
exports.iotaService = void 0;
const axios_1 = __importDefault(require("axios"));
const sdk_1 = require("@iota/sdk");
class IOTAService {
    constructor() {
        this.currentEndpointIndex = 0;
        // Initialize IOTA client
        this.client = new sdk_1.Client({
            nodes: [process.env.IOTA_NODE_URL || 'https://api.shimmer.network']
        });
        // Secret manager with mnemonic from env (wallet features may require @iota/wallet)
        this.secretManager = {
            mnemonic: process.env.IOTA_MNEMONIC || ''
        };
        this.accountAlias = process.env.IOTA_ACCOUNT_ALIAS || 'ledgerswap-main';
        this.explorerUrl = 'https://explorer.shimmer.network';
        // Legacy HTTP endpoints (used by apiRequest helpers)
        this.nodeEndpoints = [
            process.env.IOTA_NODE_URL || 'https://api.shimmer.network',
            'https://api.testnet.shimmer.network'
        ];
    }
    /**
     * Generate new IOTA address (production-ready)
     * Creates a new address from the account
     * IMPORTANT: Uses mnemonic from env for account management
     */
    generateAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            // Get or create account
            const account = yield this.client.getAccount({
                alias: this.accountAlias,
                secretManager: this.secretManager,
                onlyGetIfExists: false
            });
            // Generate new Ed25519 address
            const addressObj = yield account.generateEd25519Address();
            console.log(`✅ Generated new IOTA address: ${addressObj.address}`);
            return {
                address: addressObj.address,
                accountAlias: this.accountAlias
            };
        });
    }
    /**
     * Send IOTA transaction (production pattern)
     * Signs and submits transaction to the Tangle
     * @param toAddress - Recipient IOTA address
     * @param amount - Amount in IOTA (as string, handles BigInt)
     * @returns Block ID (IOTA uses blocks instead of transactions)
     */
    sendTransaction(toAddress, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`📤 Sending ${amount} IOTA to ${toAddress}...`);
                const account = yield this.client.getAccount({
                    alias: this.accountAlias,
                    secretManager: this.secretManager
                });
                // Prepare outputs
                const outputs = [
                    {
                        address: toAddress,
                        amount: amount
                    }
                ];
                // Send with params (allowMicroAmount: false prevents dust attacks)
                const transaction = yield account.sendWithParams(outputs, { allowMicroAmount: false });
                console.log(`✅ IOTA transaction sent! Block ID: ${transaction.blockId}`);
                return transaction.blockId;
            }
            catch (error) {
                console.error('❌ IOTA send transaction error:', error);
                throw new Error(`Failed to send IOTA: ${error.message}`);
            }
        });
    }
    /**
     * Get current node endpoint with failover
     */
    getNodeEndpoint() {
        return this.nodeEndpoints[this.currentEndpointIndex];
    }
    /**
     * Switch to next node endpoint on failure
     */
    switchToNextEndpoint() {
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.nodeEndpoints.length;
        console.log(`🔄 Switched to IOTA node endpoint: ${this.getNodeEndpoint()}`);
    }
    /**
     * Make API request to IOTA node
     */
    apiRequest(path_1) {
        return __awaiter(this, arguments, void 0, function* (path, method = 'GET', data) {
            try {
                const endpoint = this.getNodeEndpoint();
                const response = yield (0, axios_1.default)({
                    method,
                    url: `${endpoint}${path}`,
                    data,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                return response.data;
            }
            catch (error) {
                console.error(`❌ IOTA API error (${path}):`, error.message);
                this.switchToNextEndpoint();
                throw error;
            }
        });
    }
    /**
     * Get IOTA address info
     */
    getAddress(address) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const response = yield this.apiRequest(`/api/core/v2/addresses/${address}`);
                return {
                    address,
                    balance: response.balance || '0',
                    outputs: ((_a = response.outputs) === null || _a === void 0 ? void 0 : _a.map((output) => ({
                        outputId: output.outputId,
                        amount: output.amount,
                        address: output.address,
                        spent: output.isSpent || false
                    }))) || []
                };
            }
            catch (error) {
                if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 404) {
                    console.log(`ℹ️ IOTA address not found: ${address}`);
                    return null;
                }
                console.error(`❌ IOTA getAddress error:`, error.message);
                throw new Error(`Failed to get IOTA address: ${error.message}`);
            }
        });
    }
    /**
     * Get IOTA balance (in MIOTA, 1 MIOTA = 1,000,000 base units)
     */
    getBalance(address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const addressInfo = yield this.getAddress(address);
                if (!addressInfo) {
                    return '0';
                }
                // Convert base units to MIOTA
                const balance = parseInt(addressInfo.balance) / 1000000;
                return balance.toString();
            }
            catch (error) {
                console.error(`❌ IOTA getBalance error:`, error.message);
                return '0';
            }
        });
    }
    /**
     * Get native tokens held by address
     */
    getNativeTokens(address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const addressInfo = yield this.getAddress(address);
                if (!addressInfo) {
                    return [];
                }
                const tokens = [];
                // Extract native tokens from outputs
                for (const output of addressInfo.outputs) {
                    // Check if output contains native tokens (IOTA 2.0 feature)
                    // This would require additional API calls or output parsing
                    // For now, return empty array as native tokens require more complex handling
                }
                return tokens;
            }
            catch (error) {
                console.error(`❌ IOTA getNativeTokens error:`, error.message);
                return [];
            }
        });
    }
    /**
     * Get message/transaction details
     */
    getMessage(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const response = yield this.apiRequest(`/api/core/v2/messages/${messageId}`);
                const message = response.message;
                const payload = message.payload;
                // Extract transaction info from payload
                if (!payload || payload.type !== 0) { // Type 0 is transaction payload
                    return null;
                }
                // Parse essence (transaction details)
                const essence = payload.essence;
                const inputs = essence.inputs || [];
                const outputs = essence.outputs || [];
                // Extract sender addresses from inputs
                const fromAddresses = [];
                for (const input of inputs) {
                    // Would need to resolve input to address
                    fromAddresses.push(''); // Placeholder
                }
                // Extract recipient and amount from outputs
                let toAddress = '';
                let amount = '0';
                if (outputs.length > 0) {
                    toAddress = outputs[0].address;
                    amount = (parseInt(outputs[0].amount) / 1000000).toString(); // Convert to MIOTA
                }
                return {
                    messageId,
                    from: fromAddresses,
                    to: toAddress,
                    amount,
                    timestamp: message.timestamp || Date.now(),
                    confirmed: ((_a = response.metadata) === null || _a === void 0 ? void 0 : _a.ledgerInclusionState) === 'included',
                    milestone: ((_b = response.metadata) === null || _b === void 0 ? void 0 : _b.referencedByMilestoneIndex) || 0
                };
            }
            catch (error) {
                console.error(`❌ IOTA getMessage error:`, error.message);
                return null;
            }
        });
    }
    /**
     * Monitor address for new messages
     */
    monitorAddress(address_1, callback_1) {
        return __awaiter(this, arguments, void 0, function* (address, callback, interval = 10000 // Check every 10 seconds
        ) {
            console.log(`👁️ Monitoring IOTA address: ${address}`);
            let lastCheckedOutputs = new Set();
            const intervalId = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const addressInfo = yield this.getAddress(address);
                    if (!addressInfo) {
                        return;
                    }
                    // Check for new outputs
                    for (const output of addressInfo.outputs) {
                        if (!lastCheckedOutputs.has(output.outputId) && !output.spent) {
                            console.log(`💰 New IOTA output detected: ${output.outputId}`);
                            // Extract message ID from output ID
                            const messageId = output.outputId.split(':')[0];
                            const transaction = yield this.getMessage(messageId);
                            if (transaction) {
                                callback(transaction);
                            }
                            lastCheckedOutputs.add(output.outputId);
                        }
                    }
                    // Cleanup old outputs from tracking set
                    if (lastCheckedOutputs.size > 1000) {
                        lastCheckedOutputs = new Set(Array.from(lastCheckedOutputs).slice(-500));
                    }
                }
                catch (error) {
                    console.error(`❌ IOTA monitoring error:`, error.message);
                }
            }), interval);
            return intervalId;
        });
    }
    /**
     * Validate IOTA address (Bech32 format)
     */
    validateAddress(address) {
        // IOTA addresses use Bech32 format and start with 'iota' or 'smr' (Shimmer)
        // Mainnet: iota1... (63 chars)
        // Shimmer: smr1... (63 chars)
        const iotaPattern = /^iota1[a-z0-9]{59}$/;
        const shimmerPattern = /^smr1[a-z0-9]{59}$/;
        return iotaPattern.test(address) || shimmerPattern.test(address);
    }
    /**
     * Get node info
     */
    getNodeInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const response = yield this.apiRequest('/api/core/v2/info');
                return {
                    name: response.name || 'Unknown',
                    version: response.version || '0.0.0',
                    isHealthy: response.isHealthy || false,
                    latestMilestone: ((_b = (_a = response.status) === null || _a === void 0 ? void 0 : _a.latestMilestone) === null || _b === void 0 ? void 0 : _b.index) || 0,
                    confirmedMilestone: ((_d = (_c = response.status) === null || _c === void 0 ? void 0 : _c.confirmedMilestone) === null || _d === void 0 ? void 0 : _d.index) || 0
                };
            }
            catch (error) {
                console.error(`❌ IOTA getNodeInfo error:`, error.message);
                throw error;
            }
        });
    }
    /**
     * Submit message to Tangle
     */
    submitMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.apiRequest('/api/core/v2/messages', 'POST', message);
                console.log(`✅ IOTA message submitted: ${response.messageId}`);
                return response.messageId;
            }
            catch (error) {
                console.error(`❌ IOTA submitMessage error:`, error.message);
                throw new Error(`Failed to submit IOTA message: ${error.message}`);
            }
        });
    }
    /**
     * Get tips (for PoW and message submission)
     */
    getTips() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.apiRequest('/api/core/v2/tips');
                return response.tipMessageIds || [];
            }
            catch (error) {
                console.error(`❌ IOTA getTips error:`, error.message);
                return [];
            }
        });
    }
    /**
     * Get minimum PoW score required
     */
    getMinPoWScore() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const nodeInfo = yield this.getNodeInfo();
                // PoW score would be in node info response
                return 4000; // Default minimum PoW score
            }
            catch (error) {
                console.error(`❌ IOTA getMinPoWScore error:`, error.message);
                return 4000;
            }
        });
    }
    /**
     * Check if message is confirmed
     */
    isMessageConfirmed(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.apiRequest(`/api/core/v2/messages/${messageId}/metadata`);
                return response.ledgerInclusionState === 'included';
            }
            catch (error) {
                console.error(`❌ IOTA isMessageConfirmed error:`, error.message);
                return false;
            }
        });
    }
    /**
     * Get outputs by address
     */
    getOutputsByAddress(address_1) {
        return __awaiter(this, arguments, void 0, function* (address, includeSpent = false) {
            try {
                const addressInfo = yield this.getAddress(address);
                if (!addressInfo) {
                    return [];
                }
                if (!includeSpent) {
                    return addressInfo.outputs.filter(output => !output.spent);
                }
                return addressInfo.outputs;
            }
            catch (error) {
                console.error(`❌ IOTA getOutputsByAddress error:`, error.message);
                return [];
            }
        });
    }
}
exports.iotaService = new IOTAService();
exports.default = exports.iotaService;
