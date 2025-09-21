import { Router } from 'express';
import { protect, isAdmin } from '../middleware/authMiddleware';
import { listChains, setChainEnabled, listTokens, setTokenEnabled, createToken, createChain } from '../controllers/tokenChainController';

const router = Router();

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
router.get('/chains', protect, isAdmin, listChains);
router.post('/chains', protect, isAdmin, createChain);
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
router.put('/chains/:key/enabled', protect, isAdmin, setChainEnabled);

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
router.get('/tokens', protect, isAdmin, listTokens);
router.post('/tokens', protect, isAdmin, createToken);
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
router.put('/tokens/:key/enabled', protect, isAdmin, setTokenEnabled);

export default router;
