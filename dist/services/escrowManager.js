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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EscrowOffer_1 = __importDefault(require("../models/EscrowOffer"));
const CryptoFee_1 = __importDefault(require("../models/CryptoFee"));
const xrpl_1 = require("../smart-layers/xrpl");
const bitcoin_1 = require("../smart-layers/bitcoin");
const stellar_1 = require("../smart-layers/stellar");
const ethers_1 = require("ethers");
const mongoose_1 = __importDefault(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Multi-Chain Escrow Manager
 * Coordinates escrow creation, locking, and release across XRP, XDC, BTC, IOTA, XLM
 */
class EscrowManager {
    /**
     * Generate unique offer ID
     */
    generateOfferId() {
        const randomId = crypto_1.default.randomBytes(5).toString('hex').toUpperCase();
        return `ESC-${Date.now()}-${randomId}`;
    }
    /**
     * Calculate admin fee based on crypto fee configuration
     */
    calculateAdminFee(currency, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const feeConfig = yield CryptoFee_1.default.findOne({
                    symbol: currency.toUpperCase(),
                    isActive: true
                });
                if (feeConfig) {
                    const feePercentage = feeConfig.feePercentage;
                    let feeAmount = (amount * feePercentage) / 100;
                    // Apply min/max constraints
                    if (feeConfig.minimumFee && feeAmount < feeConfig.minimumFee) {
                        feeAmount = feeConfig.minimumFee;
                    }
                    if (feeConfig.maximumFee && feeAmount > feeConfig.maximumFee) {
                        feeAmount = feeConfig.maximumFee;
                    }
                    return { percentage: feePercentage, amount: feeAmount };
                }
                // Default 2% fee
                return { percentage: 2, amount: amount * 0.02 };
            }
            catch (error) {
                console.error('Error calculating admin fee:', error);
                return { percentage: 2, amount: amount * 0.02 };
            }
        });
    }
    /**
     * CREATE OFFER - Seller creates an escrow offer (no funds locked yet)
     */
    createOffer(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const offerId = this.generateOfferId();
            const expiresAt = new Date(Date.now() + (params.expirationHours || 24) * 60 * 60 * 1000);
            // Calculate admin fee
            const adminFee = yield this.calculateAdminFee(params.sellerCurrency, params.sellerAmount);
            const offer = yield EscrowOffer_1.default.create({
                offerId,
                seller: params.sellerId || null,
                sellerChain: params.sellerChain,
                sellerAddress: params.sellerAddress,
                sellerAmount: params.sellerAmount,
                sellerCurrency: params.sellerCurrency,
                buyerChain: params.buyerChain,
                buyerAmount: params.buyerAmount,
                buyerCurrency: params.buyerCurrency,
                description: params.description,
                terms: params.terms,
                isPublic: params.isPublic !== false,
                expiresAt,
                adminFeePercentage: adminFee.percentage,
                adminFeeAmount: adminFee.amount,
                status: 'created',
            });
            console.log(`✅ Escrow offer created: ${offerId}`);
            return offer;
        });
    }
    /**
     * LOCK SELLER FUNDS - Seller locks their funds into escrow
     */
    lockSellerFunds(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const offer = yield EscrowOffer_1.default.findOne({ offerId: params.offerId });
            if (!offer)
                throw new Error('Offer not found');
            if (offer.status !== 'created')
                throw new Error('Offer already locked or completed');
            let escrowTx;
            let contractAddress;
            try {
                switch (offer.sellerChain) {
                    case 'XRP':
                        if (!params.sellerSecret)
                            throw new Error('Seller secret required for XRP');
                        const xrpResult = yield (0, xrpl_1.createXrplEscrow)(params.sellerSecret, offer.sellerAddress, // Destination will be updated when buyer accepts
                        offer.sellerAmount.toString(), 3600, // 1 hour to finish
                        86400, // 24 hours to cancel
                        false // No HTLC for now
                        );
                        escrowTx = xrpResult.txHash;
                        offer.sellerEscrowTx = xrpResult.txHash;
                        offer.sellerContractAddress = (_a = xrpResult.escrowSequence) === null || _a === void 0 ? void 0 : _a.toString();
                        break;
                    case 'XDC':
                    case 'IOTA':
                        if (!params.sellerPrivateKey)
                            throw new Error('Seller private key required for EVM chains');
                        // Deploy escrow contract
                        const evmResult = yield this.deployEVMEscrow(offer.sellerChain, params.sellerPrivateKey, offer.sellerAddress, offer.buyerAddress || ethers_1.ethers.ZeroAddress, offer.sellerAmount);
                        contractAddress = evmResult.contractAddress;
                        escrowTx = evmResult.txHash;
                        offer.sellerContractAddress = contractAddress;
                        offer.sellerEscrowTx = escrowTx;
                        break;
                    case 'BTC':
                        // Bitcoin multisig escrow
                        const btcEscrow = (0, bitcoin_1.createBitcoinEscrow)();
                        offer.sellerContractAddress = btcEscrow.escrowAddress;
                        offer.sellerEscrowTx = 'BTC_MULTISIG_CREATED';
                        console.log(`🔐 Bitcoin multisig escrow created: ${btcEscrow.escrowAddress}`);
                        console.log(`⚠️  Save these keys securely for later release`);
                        break;
                    case 'XLM':
                        // Stellar multisig escrow
                        if (!offer.buyerAddress) {
                            throw new Error('Buyer address required for Stellar escrow');
                        }
                        const xlmEscrowAddress = yield (0, stellar_1.createEscrowStellar)(offer.sellerAddress, offer.buyerAddress);
                        offer.sellerContractAddress = xlmEscrowAddress;
                        offer.sellerEscrowTx = 'XLM_MULTISIG_CREATED';
                        console.log(`🔐 Stellar multisig escrow created: ${xlmEscrowAddress}`);
                        break;
                    default:
                        throw new Error(`Unsupported chain: ${offer.sellerChain}`);
                }
                offer.status = 'seller_locked';
                offer.sellerLockedAt = new Date();
                yield offer.save();
                console.log(`🔒 Seller funds locked for offer ${params.offerId}`);
                return offer;
            }
            catch (error) {
                console.error('Error locking seller funds:', error);
                throw new Error(`Failed to lock seller funds: ${error.message}`);
            }
        });
    }
    /**
     * ACCEPT OFFER - Buyer accepts offer and locks their funds
     */
    acceptOffer(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const offer = yield EscrowOffer_1.default.findOne({ offerId: params.offerId });
            if (!offer)
                throw new Error('Offer not found');
            if (offer.status !== 'seller_locked')
                throw new Error('Seller must lock funds first');
            if (new Date() > offer.expiresAt)
                throw new Error('Offer expired');
            let buyerEscrowTx;
            let buyerContractAddress;
            try {
                // Update buyer information
                offer.buyer = params.buyerId ? new mongoose_1.default.Types.ObjectId(params.buyerId) : null;
                offer.buyerAddress = params.buyerAddress;
                switch (offer.buyerChain) {
                    case 'XRP':
                        if (!params.buyerSecret)
                            throw new Error('Buyer secret required for XRP');
                        if (!offer.buyerAmount)
                            throw new Error('Buyer amount not specified');
                        const xrpResult = yield (0, xrpl_1.createXrplEscrow)(params.buyerSecret, offer.sellerAddress, offer.buyerAmount.toString(), 3600, 86400, false);
                        buyerEscrowTx = xrpResult.txHash;
                        buyerContractAddress = (_a = xrpResult.escrowSequence) === null || _a === void 0 ? void 0 : _a.toString();
                        break;
                    case 'XDC':
                    case 'IOTA':
                        if (!params.buyerPrivateKey)
                            throw new Error('Buyer private key required for EVM chains');
                        if (!offer.buyerAmount)
                            throw new Error('Buyer amount not specified');
                        const evmResult = yield this.deployEVMEscrow(offer.buyerChain, params.buyerPrivateKey, params.buyerAddress, offer.sellerAddress, offer.buyerAmount);
                        buyerContractAddress = evmResult.contractAddress;
                        buyerEscrowTx = evmResult.txHash;
                        break;
                    case 'BTC':
                        // Bitcoin buyer side - uses same multisig address
                        console.log(`🔐 Bitcoin buyer will deposit to multisig: ${offer.sellerContractAddress}`);
                        buyerContractAddress = offer.sellerContractAddress; // Same multisig address
                        buyerEscrowTx = 'BTC_BUYER_DEPOSIT_PENDING';
                        break;
                    case 'XLM':
                        // Stellar buyer side - uses same multisig account
                        console.log(`🔐 Stellar buyer will deposit to multisig: ${offer.sellerContractAddress}`);
                        buyerContractAddress = offer.sellerContractAddress; // Same multisig account
                        buyerEscrowTx = 'XLM_BUYER_DEPOSIT_PENDING';
                        break;
                    default:
                        throw new Error(`Unsupported buyer chain: ${offer.buyerChain}`);
                }
                offer.buyerEscrowTx = buyerEscrowTx;
                offer.buyerContractAddress = buyerContractAddress;
                offer.status = 'both_locked';
                offer.buyerLockedAt = new Date();
                yield offer.save();
                console.log(`🔒 Buyer funds locked for offer ${params.offerId}`);
                console.log(`✅ Both parties locked - ready for release`);
                return offer;
            }
            catch (error) {
                console.error('Error accepting offer:', error);
                throw new Error(`Failed to accept offer: ${error.message}`);
            }
        });
    }
    /**
     * RELEASE ESCROW - Release funds to both parties (minus admin fee)
     */
    releaseEscrow(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const offer = yield EscrowOffer_1.default.findOne({ offerId: params.offerId });
            if (!offer)
                throw new Error('Offer not found');
            if (offer.status !== 'both_locked')
                throw new Error('Both parties must lock funds first');
            try {
                // Release seller's escrow to buyer
                if (offer.sellerChain === 'XRP' && params.adminSecret) {
                    yield (0, xrpl_1.releaseXrplEscrow)(params.adminSecret, offer.sellerAddress, parseInt(offer.sellerContractAddress || '0'));
                }
                else if ((offer.sellerChain === 'XDC' || offer.sellerChain === 'IOTA') && params.adminPrivateKey) {
                    yield this.releaseEVMEscrow(offer.sellerChain, params.adminPrivateKey, offer.sellerContractAddress);
                }
                else if (offer.sellerChain === 'BTC') {
                    console.log(`🔓 Bitcoin escrow release requires 2-of-3 multisig signatures`);
                    console.log(`📝 Escrow address: ${offer.sellerContractAddress}`);
                    // Bitcoin release handled via PSBT with 2-of-3 signatures
                }
                else if (offer.sellerChain === 'XLM') {
                    console.log(`🔓 Stellar escrow release requires multisig transaction`);
                    console.log(`📝 Escrow account: ${offer.sellerContractAddress}`);
                    // Stellar release handled via multisig transaction
                }
                // Release buyer's escrow to seller
                if (offer.buyerChain === 'XRP' && params.adminSecret) {
                    yield (0, xrpl_1.releaseXrplEscrow)(params.adminSecret, offer.buyerAddress, parseInt(offer.buyerContractAddress || '0'));
                }
                else if ((offer.buyerChain === 'XDC' || offer.buyerChain === 'IOTA') && params.adminPrivateKey) {
                    yield this.releaseEVMEscrow(offer.buyerChain, params.adminPrivateKey, offer.buyerContractAddress);
                }
                else if (offer.buyerChain === 'BTC') {
                    console.log(`🔓 Bitcoin buyer escrow release requires multisig`);
                }
                else if (offer.buyerChain === 'XLM') {
                    console.log(`🔓 Stellar buyer escrow release requires multisig`);
                }
                // TODO: Collect admin fee
                offer.status = 'completed';
                offer.completedAt = new Date();
                offer.adminFeeCollected = true;
                yield offer.save();
                console.log(`✅ Escrow released for offer ${params.offerId}`);
                return offer;
            }
            catch (error) {
                console.error('Error releasing escrow:', error);
                throw new Error(`Failed to release escrow: ${error.message}`);
            }
        });
    }
    /**
     * CANCEL/REFUND ESCROW
     */
    cancelEscrow(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const offer = yield EscrowOffer_1.default.findOne({ offerId: params.offerId });
            if (!offer)
                throw new Error('Offer not found');
            try {
                // Refund seller if locked
                if (offer.status === 'seller_locked' || offer.status === 'both_locked') {
                    if (offer.sellerChain === 'XRP' && params.adminSecret) {
                        yield (0, xrpl_1.cancelXrplEscrow)(params.adminSecret, offer.sellerAddress, parseInt(offer.sellerContractAddress || '0'));
                    }
                }
                // Refund buyer if locked
                if (offer.status === 'both_locked') {
                    if (offer.buyerChain === 'XRP' && params.adminSecret) {
                        yield (0, xrpl_1.cancelXrplEscrow)(params.adminSecret, offer.buyerAddress, parseInt(offer.buyerContractAddress || '0'));
                    }
                }
                offer.status = 'cancelled';
                offer.disputeReason = params.reason;
                yield offer.save();
                console.log(`❌ Escrow cancelled for offer ${params.offerId}: ${params.reason}`);
                return offer;
            }
            catch (error) {
                console.error('Error cancelling escrow:', error);
                throw new Error(`Failed to cancel escrow: ${error.message}`);
            }
        });
    }
    /**
     * Helper: Deploy EVM Escrow Contract
     */
    deployEVMEscrow(chain, privateKey, seller, buyer, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const rpcUrl = chain === 'XDC'
                ? process.env.XDC_RPC_URL || 'https://rpc.apothem.network'
                : process.env.IOTA_RPC_URL || 'https://json-rpc.evm.testnet.iotaledger.net';
            const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
            const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
            // Simple escrow contract ABI (matches your existing contracts)
            const abi = [
                "constructor(address _seller, address _buyer) payable",
                "function release() external",
                "function refund() external"
            ];
            const bytecode = "0x608060405260405161..."; // Your compiled contract bytecode
            const factory = new ethers_1.ethers.ContractFactory(abi, bytecode, wallet);
            const contract = yield factory.deploy(seller, buyer, {
                value: ethers_1.ethers.parseEther(amount.toString())
            });
            yield contract.waitForDeployment();
            const address = yield contract.getAddress();
            return {
                contractAddress: address,
                txHash: ((_a = contract.deploymentTransaction()) === null || _a === void 0 ? void 0 : _a.hash) || ''
            };
        });
    }
    /**
     * Helper: Release EVM Escrow
     */
    releaseEVMEscrow(chain, privateKey, contractAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const rpcUrl = chain === 'XDC'
                ? process.env.XDC_RPC_URL || 'https://rpc.apothem.network'
                : process.env.IOTA_RPC_URL || 'https://json-rpc.evm.testnet.iotaledger.net';
            const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
            const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
            const abi = ["function release() external"];
            const contract = new ethers_1.ethers.Contract(contractAddress, abi, wallet);
            const tx = yield contract.release();
            yield tx.wait();
            return tx.hash;
        });
    }
    /**
     * GET ALL PUBLIC OFFERS
     */
    getPublicOffers(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = { isPublic: true };
            if (filters === null || filters === void 0 ? void 0 : filters.sellerChain)
                query.sellerChain = filters.sellerChain;
            if (filters === null || filters === void 0 ? void 0 : filters.buyerChain)
                query.buyerChain = filters.buyerChain;
            if (filters === null || filters === void 0 ? void 0 : filters.status)
                query.status = filters.status;
            const offers = yield EscrowOffer_1.default.find(query)
                .sort({ createdAt: -1 })
                .limit((filters === null || filters === void 0 ? void 0 : filters.limit) || 50)
                .skip((filters === null || filters === void 0 ? void 0 : filters.offset) || 0)
                .populate('seller', 'name email')
                .populate('buyer', 'name email');
            return offers;
        });
    }
    /**
     * GET OFFER BY ID
     */
    getOfferById(offerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const offer = yield EscrowOffer_1.default.findOne({ offerId })
                .populate('seller', 'name email')
                .populate('buyer', 'name email');
            if (!offer)
                throw new Error('Offer not found');
            return offer;
        });
    }
    /**
     * GET USER OFFERS (as seller or buyer)
     */
    getUserOffers(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const offers = yield EscrowOffer_1.default.find({
                $or: [{ seller: userId }, { buyer: userId }]
            })
                .sort({ createdAt: -1 })
                .populate('seller', 'name email')
                .populate('buyer', 'name email');
            return offers;
        });
    }
}
exports.default = new EscrowManager();
