import { Router, Request, Response } from 'express';
import { protect, isAdmin, AuthRequest } from '../middleware/authMiddleware';
import { listUsers, updateUserRole, listAllTransactions, listFlaggedAddresses, getAdminMetrics, getPlatformSettings, updateSwapFeePercent, getFeeRevenueLastNDays, listTradeActivity, updatePlatformSettings, sendSupportEmail, listSupportMessages, adminFlagAddress, adminListChains, adminSetChainEnabled, adminListTokens, adminSetTokenEnabled, adminCreateToken } from '../controllers/adminController';
import { adminListDisputes, adminUpdateDisputeStatus, adminReplyToDispute } from '../controllers/disputeController';

const router = Router();

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
router.get('/ping', protect, isAdmin, (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  res.json({ ok: true, message: 'Admin access confirmed', user: { id: authReq.user?._id, email: authReq.user?.email, role: authReq.user?.role } });
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
router.get('/users', protect, isAdmin, listUsers);
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
router.put('/users/:id/role', protect, isAdmin, updateUserRole);

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
router.get('/transactions', protect, isAdmin, listAllTransactions);
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
router.get('/flagged-addresses', protect, isAdmin, listFlaggedAddresses);
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
router.post('/flagged-addresses', protect, isAdmin, adminFlagAddress);
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
router.get('/metrics', protect, isAdmin, getAdminMetrics);
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
router.get('/settings', protect, isAdmin, getPlatformSettings);
router.put('/settings', protect, isAdmin, updatePlatformSettings);
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
router.put('/settings/swap-fee', protect, isAdmin, updateSwapFeePercent);
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
router.get('/fees/revenue', protect, isAdmin, getFeeRevenueLastNDays);
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
router.get('/activity', protect, isAdmin, listTradeActivity);
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
router.get('/disputes', protect, isAdmin, adminListDisputes);
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
router.put('/disputes/:id/status', protect, isAdmin, adminUpdateDisputeStatus);
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
router.post('/disputes/:id/reply', protect, isAdmin, adminReplyToDispute);

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
router.post('/support/email', protect, isAdmin, sendSupportEmail);

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
router.get('/support/messages', protect, isAdmin, listSupportMessages);

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
router.get('/management/chains', protect, isAdmin, adminListChains);

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
router.put('/management/chains/:key/enabled', protect, isAdmin, adminSetChainEnabled);

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
router.get('/management/tokens', protect, isAdmin, adminListTokens);
router.post('/management/tokens', protect, isAdmin, adminCreateToken);

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
router.put('/management/tokens/:key/enabled', protect, isAdmin, adminSetTokenEnabled);

export default router;

