"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const tokenChainController_1 = require("../controllers/tokenChainController");
const router = (0, express_1.Router)();
// Chains
/**
 * @openapi
 * /api/admin/management/chains:
 *   get:
 *     summary: List all chains
 *     tags: [Admin-Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of chains
 */
router.get('/chains', authMiddleware_1.protect, authMiddleware_1.isAdmin, tokenChainController_1.listChains);
router.post('/chains', authMiddleware_1.protect, authMiddleware_1.isAdmin, tokenChainController_1.createChain);
/**
 * @openapi
 * /api/admin/management/chains/{key}/enabled:
 *   put:
 *     summary: Enable/disable a chain
 *     tags: [Admin-Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Updated
 */
router.put('/chains/:key/enabled', authMiddleware_1.protect, authMiddleware_1.isAdmin, tokenChainController_1.setChainEnabled);
// Tokens
/**
 * @openapi
 * /api/admin/management/tokens:
 *   get:
 *     summary: List all tokens
 *     tags: [Admin-Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of tokens
 */
router.get('/tokens', authMiddleware_1.protect, authMiddleware_1.isAdmin, tokenChainController_1.listTokens);
router.post('/tokens', authMiddleware_1.protect, authMiddleware_1.isAdmin, tokenChainController_1.createToken);
/**
 * @openapi
 * /api/admin/management/tokens/{key}/enabled:
 *   put:
 *     summary: Enable/disable a token
 *     tags: [Admin-Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Updated
 */
router.put('/tokens/:key/enabled', authMiddleware_1.protect, authMiddleware_1.isAdmin, tokenChainController_1.setTokenEnabled);
exports.default = router;
