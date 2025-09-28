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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: "-createdAt"
 *         description: Sort order
 *     responses:
 *       '200':
 *         description: Paginated list of exchange history records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 pages:
 *                   type: integer
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.route('/').post(protect, createExchangeHistory).get(protect, getExchangeHistory);

export default router;
