"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payoutController_1 = require("../controllers/payoutController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
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
router.route('/').post(authMiddleware_1.protect, payoutController_1.createPayout).get(authMiddleware_1.protect, payoutController_1.getPayouts);
exports.default = router;
