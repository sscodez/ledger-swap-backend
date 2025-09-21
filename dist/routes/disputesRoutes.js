"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const disputeController_1 = require("../controllers/disputeController");
const router = (0, express_1.Router)();
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
router.post('/', authMiddleware_1.protect, disputeController_1.createDispute);
router.get('/', authMiddleware_1.protect, disputeController_1.listMyDisputes);
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
router.get('/:id', authMiddleware_1.protect, disputeController_1.getDisputeById);
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
router.post('/:id/messages', authMiddleware_1.protect, disputeController_1.addMessageToDispute);
exports.default = router;
