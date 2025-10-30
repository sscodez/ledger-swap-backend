"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const escrowController_1 = require("../controllers/escrowController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
/**
 * @swagger
 * /api/escrow/offers:
 *   post:
 *     summary: Create a new escrow offer
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sellerChain
 *               - sellerAddress
 *               - sellerAmount
 *               - sellerCurrency
 *             properties:
 *               sellerChain:
 *                 type: string
 *                 enum: [XRP, XDC, BTC, IOTA, XLM]
 *               sellerAddress:
 *                 type: string
 *               sellerAmount:
 *                 type: number
 *               sellerCurrency:
 *                 type: string
 *               buyerChain:
 *                 type: string
 *                 enum: [XRP, XDC, BTC, IOTA, XLM]
 *               buyerAmount:
 *                 type: number
 *               buyerCurrency:
 *                 type: string
 *               description:
 *                 type: string
 *               terms:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               expirationHours:
 *                 type: number
 *     responses:
 *       201:
 *         description: Escrow offer created successfully
 */
router.post('/offers', authMiddleware_1.optionalAuth, escrowController_1.createEscrowOffer);
/**
 * @swagger
 * /api/escrow/offers:
 *   get:
 *     summary: Get all public escrow offers
 *     tags: [Escrow]
 *     parameters:
 *       - in: query
 *         name: sellerChain
 *         schema:
 *           type: string
 *       - in: query
 *         name: buyerChain
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of public offers
 */
router.get('/offers', escrowController_1.getPublicOffers);
/**
 * @swagger
 * /api/escrow/offers/{offerId}:
 *   get:
 *     summary: Get offer by ID
 *     tags: [Escrow]
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offer details
 *       404:
 *         description: Offer not found
 */
router.get('/offers/:offerId', escrowController_1.getOfferById);
/**
 * @swagger
 * /api/escrow/offers/{offerId}/lock-seller:
 *   post:
 *     summary: Lock seller funds into escrow
 *     tags: [Escrow]
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sellerSecret:
 *                 type: string
 *                 description: For XRPL transactions
 *               sellerPrivateKey:
 *                 type: string
 *                 description: For EVM chains
 *     responses:
 *       200:
 *         description: Seller funds locked successfully
 */
router.post('/offers/:offerId/lock-seller', escrowController_1.lockSellerFunds);
/**
 * @swagger
 * /api/escrow/offers/{offerId}/accept:
 *   post:
 *     summary: Accept offer and lock buyer funds
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buyerAddress
 *             properties:
 *               buyerAddress:
 *                 type: string
 *               buyerSecret:
 *                 type: string
 *               buyerPrivateKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Offer accepted and buyer funds locked
 */
router.post('/offers/:offerId/accept', authMiddleware_1.optionalAuth, escrowController_1.acceptOffer);
/**
 * @swagger
 * /api/escrow/offers/{offerId}/release:
 *   post:
 *     summary: Release escrow funds (admin only)
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminSecret:
 *                 type: string
 *               adminPrivateKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Escrow released successfully
 */
router.post('/offers/:offerId/release', authMiddleware_1.protect, escrowController_1.releaseEscrow);
/**
 * @swagger
 * /api/escrow/offers/{offerId}/cancel:
 *   post:
 *     summary: Cancel escrow and refund
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               adminSecret:
 *                 type: string
 *               adminPrivateKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Escrow cancelled successfully
 */
router.post('/offers/:offerId/cancel', authMiddleware_1.protect, escrowController_1.cancelEscrow);
/**
 * @swagger
 * /api/escrow/my-offers:
 *   get:
 *     summary: Get user's offers (as seller or buyer)
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's offers
 */
router.get('/my-offers', authMiddleware_1.protect, escrowController_1.getUserOffers);
exports.default = router;
