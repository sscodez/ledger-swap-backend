import { Router } from 'express';
import { createPayout, getPayouts } from '../controllers/payoutController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

/**
 * @openapi
 * /api/payouts:
 *   post:
 *     summary: Create a payout
 *     tags: [Payouts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       '201':
 *         description: Payout created
 *   get:
 *     summary: Get payouts for current user
 *     tags: [Payouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of payouts
 */
router.route('/').post(protect, createPayout).get(protect, getPayouts);

export default router;
