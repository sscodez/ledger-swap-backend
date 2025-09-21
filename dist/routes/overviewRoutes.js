"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const overviewController_1 = require("../controllers/overviewController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/overview:
 *   get:
 *     summary: Get overview metrics for the current user
 *     tags: [Overview]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Overview data
 */
router.route('/').get(authMiddleware_1.protect, overviewController_1.getOverview);
exports.default = router;
