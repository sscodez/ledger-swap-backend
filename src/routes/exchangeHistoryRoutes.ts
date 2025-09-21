import { Router } from 'express';
import { createExchangeHistory, getExchangeHistory } from '../controllers/exchangeHistoryController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

/**
 * @openapi
 * /api/exchange-history:
 *   post:
 *     summary: Create an exchange history record
 *     tags: [ExchangeHistory]
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
 *         description: Exchange history created
 *   get:
 *     summary: Get exchange history for current user
 *     tags: [ExchangeHistory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of exchange history records
 */
router.route('/').post(protect, createExchangeHistory).get(protect, getExchangeHistory);

export default router;
