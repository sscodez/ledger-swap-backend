"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminController_1 = require("../controllers/adminController");
const disputeController_1 = require("../controllers/disputeController");
const router = (0, express_1.Router)();
// Simple admin-only heartbeat endpoint
/**
 * @openapi
 * /api/admin/ping:
 *   get:
 *     summary: Admin heartbeat (requires admin auth)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Returns a simple OK with user info when admin access is confirmed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Admin access confirmed
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 */
router.get('/ping', authMiddleware_1.protect, authMiddleware_1.isAdmin, (req, res) => {
    var _a, _b, _c;
    const authReq = req;
    res.json({ ok: true, message: 'Admin access confirmed', user: { id: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a._id, email: (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.email, role: (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.role } });
});
// Admin APIs
/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     summary: List all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of users
 */
router.get('/users', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.listUsers);
/**
 * @openapi
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Update a user's role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               role:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Role updated
 */
router.put('/users/:id/role', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.updateUserRole);
// All transactions across all users
/**
 * @openapi
 * /api/admin/transactions:
 *   get:
 *     summary: List all transactions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of transactions
 */
router.get('/transactions', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.listAllTransactions);
/**
 * @openapi
 * /api/admin/flagged-addresses:
 *   get:
 *     summary: List flagged addresses
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of flagged addresses
 */
router.get('/flagged-addresses', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.listFlaggedAddresses);
/**
 * @openapi
 * /api/admin/flagged-addresses:
 *   post:
 *     summary: Create or update a flagged address (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [coin, network, address]
 *             properties:
 *               coin:
 *                 type: string
 *               network:
 *                 type: string
 *               address:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Flagged address created/updated
 */
router.post('/flagged-addresses', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.adminFlagAddress);
/**
 * @openapi
 * /api/admin/metrics:
 *   get:
 *     summary: Admin metrics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Metrics summary
 */
router.get('/metrics', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.getAdminMetrics);
/**
 * @openapi
 * /api/admin/settings:
 *   get:
 *     summary: Get platform settings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Platform settings
 *   put:
 *     summary: Update platform settings
 *     tags: [Admin]
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
 *       '200':
 *         description: Settings updated
 */
router.get('/settings', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.getPlatformSettings);
router.put('/settings', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.updatePlatformSettings);
/**
 * @openapi
 * /api/admin/settings/swap-fee:
 *   put:
 *     summary: Update swap fee percent
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               swapFeePercent:
 *                 type: number
 *     responses:
 *       '200':
 *         description: Swap fee updated
 */
router.put('/settings/swap-fee', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.updateSwapFeePercent);
/**
 * @openapi
 * /api/admin/fees/revenue:
 *   get:
 *     summary: Get fee revenue for last N days
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         required: false
 *         description: Number of days
 *     responses:
 *       '200':
 *         description: Fee revenue
 */
router.get('/fees/revenue', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.getFeeRevenueLastNDays);
/**
 * @openapi
 * /api/admin/activity:
 *   get:
 *     summary: List trade activity
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Trade activity list
 */
router.get('/activity', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.listTradeActivity);
/**
 * @openapi
 * /api/admin/disputes:
 *   get:
 *     summary: List all disputes (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Disputes list
 */
router.get('/disputes', authMiddleware_1.protect, authMiddleware_1.isAdmin, disputeController_1.adminListDisputes);
/**
 * @openapi
 * /api/admin/disputes/{id}/status:
 *   put:
 *     summary: Update dispute status (admin)
 *     tags: [Admin]
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
 *               status:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Dispute status updated
 */
router.put('/disputes/:id/status', authMiddleware_1.protect, authMiddleware_1.isAdmin, disputeController_1.adminUpdateDisputeStatus);
/**
 * @openapi
 * /api/admin/disputes/{id}/reply:
 *   post:
 *     summary: Reply to a dispute (admin)
 *     tags: [Admin]
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
 *         description: Reply added
 */
router.post('/disputes/:id/reply', authMiddleware_1.protect, authMiddleware_1.isAdmin, disputeController_1.adminReplyToDispute);
/**
 * @openapi
 * /api/admin/support/email:
 *   post:
 *     summary: Send an email to support (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, message]
 *             properties:
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *               fromEmail:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Support email sent
 *       '202':
 *         description: Accepted but email delivery not configured
 */
router.post('/support/email', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.sendSupportEmail);
/**
 * @openapi
 * /api/admin/support/messages:
 *   get:
 *     summary: List sent support messages
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Paginated list of support messages
 */
router.get('/support/messages', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.listSupportMessages);
// Management endpoints for tokens and chains
/**
 * @openapi
 * /api/admin/management/chains:
 *   get:
 *     summary: List all chains
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of chains
 */
router.get('/management/chains', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.adminListChains);
/**
 * @openapi
 * /api/admin/management/chains/{key}/enabled:
 *   put:
 *     summary: Enable or disable a chain
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
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
 *               enabled:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Chain updated
 */
router.put('/management/chains/:key/enabled', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.adminSetChainEnabled);
/**
 * @openapi
 * /api/admin/management/tokens:
 *   get:
 *     summary: List all tokens
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of tokens
 *   post:
 *     summary: Create a new token
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol, name, chainKey]
 *             properties:
 *               symbol:
 *                 type: string
 *               name:
 *                 type: string
 *               chainKey:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       '201':
 *         description: Token created
 */
router.get('/management/tokens', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.adminListTokens);
router.post('/management/tokens', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.adminCreateToken);
/**
 * @openapi
 * /api/admin/management/tokens/{key}/enabled:
 *   put:
 *     summary: Enable or disable a token
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
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
 *               enabled:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Token updated
 */
router.put('/management/tokens/:key/enabled', authMiddleware_1.protect, authMiddleware_1.isAdmin, adminController_1.adminSetTokenEnabled);
exports.default = router;
