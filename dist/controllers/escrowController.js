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
exports.getUserOffers = exports.cancelEscrow = exports.releaseEscrow = exports.acceptOffer = exports.lockSellerFunds = exports.getOfferById = exports.getPublicOffers = exports.createEscrowOffer = void 0;
const escrowManager_1 = __importDefault(require("../services/escrowManager"));
/**
 * CREATE ESCROW OFFER
 * POST /api/escrow/offers
 */
const createEscrowOffer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const authReq = req;
    try {
        const { sellerChain, sellerAddress, sellerAmount, sellerCurrency, buyerChain, buyerAmount, buyerCurrency, description, terms, isPublic, expirationHours } = req.body;
        if (!sellerChain || !sellerAddress || !sellerAmount || !sellerCurrency) {
            return res.status(400).json({
                message: 'Missing required fields: sellerChain, sellerAddress, sellerAmount, sellerCurrency'
            });
        }
        const offer = yield escrowManager_1.default.createOffer({
            sellerId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a._id.toString(),
            sellerChain,
            sellerAddress,
            sellerAmount: Number(sellerAmount),
            sellerCurrency,
            buyerChain,
            buyerAmount: buyerAmount ? Number(buyerAmount) : undefined,
            buyerCurrency,
            description,
            terms,
            isPublic: isPublic !== false,
            expirationHours: expirationHours || 24
        });
        return res.status(201).json({
            success: true,
            offer,
            message: 'Escrow offer created successfully'
        });
    }
    catch (error) {
        console.error('Error creating escrow offer:', error);
        return res.status(500).json({
            message: 'Failed to create escrow offer',
            error: error.message
        });
    }
});
exports.createEscrowOffer = createEscrowOffer;
/**
 * GET PUBLIC OFFERS
 * GET /api/escrow/offers
 */
const getPublicOffers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sellerChain, buyerChain, status, limit, offset } = req.query;
        const offers = yield escrowManager_1.default.getPublicOffers({
            sellerChain: sellerChain,
            buyerChain: buyerChain,
            status: status,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0
        });
        return res.json({
            success: true,
            count: offers.length,
            offers
        });
    }
    catch (error) {
        console.error('Error fetching offers:', error);
        return res.status(500).json({
            message: 'Failed to fetch offers',
            error: error.message
        });
    }
});
exports.getPublicOffers = getPublicOffers;
/**
 * GET OFFER BY ID
 * GET /api/escrow/offers/:offerId
 */
const getOfferById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { offerId } = req.params;
        const offer = yield escrowManager_1.default.getOfferById(offerId);
        return res.json({
            success: true,
            offer
        });
    }
    catch (error) {
        console.error('Error fetching offer:', error);
        return res.status(404).json({
            message: 'Offer not found',
            error: error.message
        });
    }
});
exports.getOfferById = getOfferById;
/**
 * LOCK SELLER FUNDS
 * POST /api/escrow/offers/:offerId/lock-seller
 */
const lockSellerFunds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { offerId } = req.params;
        const { sellerSecret, sellerPrivateKey } = req.body;
        const offer = yield escrowManager_1.default.lockSellerFunds({
            offerId,
            sellerSecret,
            sellerPrivateKey
        });
        return res.json({
            success: true,
            offer,
            message: 'Seller funds locked successfully'
        });
    }
    catch (error) {
        console.error('Error locking seller funds:', error);
        return res.status(500).json({
            message: 'Failed to lock seller funds',
            error: error.message
        });
    }
});
exports.lockSellerFunds = lockSellerFunds;
/**
 * ACCEPT OFFER (Buyer locks funds)
 * POST /api/escrow/offers/:offerId/accept
 */
const acceptOffer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const authReq = req;
    try {
        const { offerId } = req.params;
        const { buyerAddress, buyerSecret, buyerPrivateKey } = req.body;
        if (!buyerAddress) {
            return res.status(400).json({ message: 'Buyer address is required' });
        }
        const offer = yield escrowManager_1.default.acceptOffer({
            offerId,
            buyerId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a._id.toString(),
            buyerAddress,
            buyerSecret,
            buyerPrivateKey
        });
        return res.json({
            success: true,
            offer,
            message: 'Offer accepted and buyer funds locked'
        });
    }
    catch (error) {
        console.error('Error accepting offer:', error);
        return res.status(500).json({
            message: 'Failed to accept offer',
            error: error.message
        });
    }
});
exports.acceptOffer = acceptOffer;
/**
 * RELEASE ESCROW (Admin/Authorized)
 * POST /api/escrow/offers/:offerId/release
 */
const releaseEscrow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { offerId } = req.params;
        const { adminSecret, adminPrivateKey } = req.body;
        const offer = yield escrowManager_1.default.releaseEscrow({
            offerId,
            adminSecret,
            adminPrivateKey
        });
        return res.json({
            success: true,
            offer,
            message: 'Escrow released successfully'
        });
    }
    catch (error) {
        console.error('Error releasing escrow:', error);
        return res.status(500).json({
            message: 'Failed to release escrow',
            error: error.message
        });
    }
});
exports.releaseEscrow = releaseEscrow;
/**
 * CANCEL ESCROW
 * POST /api/escrow/offers/:offerId/cancel
 */
const cancelEscrow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const authReq = req;
    try {
        const { offerId } = req.params;
        const { reason, adminSecret, adminPrivateKey } = req.body;
        if (!reason) {
            return res.status(400).json({ message: 'Cancellation reason is required' });
        }
        const offer = yield escrowManager_1.default.cancelEscrow({
            offerId,
            reason,
            cancelledBy: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a._id.toString(),
            adminSecret,
            adminPrivateKey
        });
        return res.json({
            success: true,
            offer,
            message: 'Escrow cancelled successfully'
        });
    }
    catch (error) {
        console.error('Error cancelling escrow:', error);
        return res.status(500).json({
            message: 'Failed to cancel escrow',
            error: error.message
        });
    }
});
exports.cancelEscrow = cancelEscrow;
/**
 * GET USER OFFERS
 * GET /api/escrow/my-offers
 */
const getUserOffers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    try {
        if (!authReq.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const offers = yield escrowManager_1.default.getUserOffers(authReq.user._id.toString());
        return res.json({
            success: true,
            count: offers.length,
            offers
        });
    }
    catch (error) {
        console.error('Error fetching user offers:', error);
        return res.status(500).json({
            message: 'Failed to fetch user offers',
            error: error.message
        });
    }
});
exports.getUserOffers = getUserOffers;
