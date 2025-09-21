"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const exchangeHistoryController_1 = require("../controllers/exchangeHistoryController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
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
router.route('/').post(authMiddleware_1.protect, exchangeHistoryController_1.createExchangeHistory).get(authMiddleware_1.protect, exchangeHistoryController_1.getExchangeHistory);
exports.default = router;
