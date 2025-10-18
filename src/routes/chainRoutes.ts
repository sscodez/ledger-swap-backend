/**
 * Chain Management Routes
 */

import express from 'express';
import {
  getAllChains,
  getChainByKey,
  createChain,
  updateChain,
  toggleChainStatus,
  deleteChain,
  getChainStats
} from '../controllers/chainController';
import { protect, isAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/', getAllChains);
router.get('/stats', getChainStats);
router.get('/:key', getChainByKey);

// Admin routes
router.post('/', protect, isAdmin, createChain);
router.put('/:key', protect, isAdmin, updateChain);
router.patch('/:key/status', protect, isAdmin, toggleChainStatus);
router.delete('/:key', protect, isAdmin, deleteChain);

export default router;
