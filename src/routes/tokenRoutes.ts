/**
 * Token Management Routes
 */

import express from 'express';
import {
  getAllTokens,
  getTokenByKey,
  getTokensByChain,
  createToken,
  updateToken,
  toggleTokenStatus,
  deleteToken,
  bulkCreateTokens,
  getTokenStats,
  searchTokens
} from '../controllers/tokenController';
import { protect, isAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/', getAllTokens);
router.get('/search', searchTokens);
router.get('/stats', getTokenStats);
router.get('/chain/:chainKey', getTokensByChain);
router.get('/:key', getTokenByKey);

// Admin routes
router.post('/', protect, isAdmin, createToken);
router.post('/bulk', protect, isAdmin, bulkCreateTokens);
router.put('/:key', protect, isAdmin, updateToken);
router.patch('/:key/status', protect, isAdmin, toggleTokenStatus);
router.delete('/:key', protect, isAdmin, deleteToken);

export default router;
