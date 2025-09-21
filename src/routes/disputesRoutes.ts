import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { createDispute, listMyDisputes, getDisputeById, addMessageToDispute } from '../controllers/disputeController';

const router = Router();

// User routes (all require auth)
/**
 * @openapi
 * /api/disputes:
 *   post:
 *     summary: Create a new dispute
 *     tags: [Disputes]
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
 *         description: Dispute created
 *   get:
 *     summary: List my disputes
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of disputes
 */
router.post('/', protect, createDispute);
router.get('/', protect, listMyDisputes);

/**
 * @openapi
 * /api/disputes/{id}:
 *   get:
 *     summary: Get a dispute by ID
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Dispute details
 */
router.get('/:id', protect, getDisputeById);

/**
 * @openapi
 * /api/disputes/{id}/messages:
 *   post:
 *     summary: Add a message to a dispute
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               message:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Message added
 */
router.post('/:id/messages', protect, addMessageToDispute);

export default router;
