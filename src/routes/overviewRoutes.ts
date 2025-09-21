import { Router } from 'express';
import { getOverview } from '../controllers/overviewController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

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
router.route('/').get(protect, getOverview);

export default router;
