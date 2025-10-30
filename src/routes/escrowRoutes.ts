import express from 'express';
import {
  createEscrowOffer,
  getPublicOffers,
  getOfferById,
  lockSellerFunds,
  acceptOffer,
  releaseEscrow,
  cancelEscrow,
  getUserOffers
} from '../controllers/escrowController';
import { protect, optionalAuth } from '../middleware/authMiddleware';

const router = express.Router();

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
router.post('/offers', optionalAuth, createEscrowOffer);

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
router.get('/offers', getPublicOffers);

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
router.get('/offers/:offerId', getOfferById);

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
router.post('/offers/:offerId/lock-seller', lockSellerFunds);

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
router.post('/offers/:offerId/accept', optionalAuth, acceptOffer);

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
router.post('/offers/:offerId/release', protect, releaseEscrow);

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
router.post('/offers/:offerId/cancel', protect, cancelEscrow);

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
router.get('/my-offers', protect, getUserOffers);

export default router;
