import express from 'express';
import {
  getAllCryptoFees,
  getCryptoFeeById,
  getCryptoFeeBySymbol,
  createCryptoFee,
  updateCryptoFee,
  deleteCryptoFee,
  toggleCryptoFeeStatus,
  calculateFee
} from '../controllers/cryptoFeeController';
import { protect, isAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes (for fee calculation)
router.get('/calculate/:symbol/:amount', calculateFee);
router.get('/symbol/:symbol', getCryptoFeeBySymbol);

// Admin-only routes
router.use(protect); // Require authentication for all routes below
router.use(isAdmin); // Require admin role for all routes below

// CRUD operations
router.get('/', getAllCryptoFees);
router.get('/:id', getCryptoFeeById);
router.post('/', createCryptoFee);
router.put('/:id', updateCryptoFee);
router.delete('/:id', deleteCryptoFee);
router.patch('/:id/toggle', toggleCryptoFeeStatus);

export default router;
