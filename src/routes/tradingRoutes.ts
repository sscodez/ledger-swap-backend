import { Router } from 'express';
import { optionalAuth } from '../middleware/authMiddleware';
import {
  getTradingQuote,
  executeSwap,
  getSwapStatus,
  simulateSwap,
  getSupportedTokens,
  getSupportedTradingPairs,
  getTradingHealth
} from '../controllers/tradingController';

const router = Router();

// Public routes - no authentication required
router.get('/health', getTradingHealth);
router.get('/quote', getTradingQuote);
router.get('/supported-tokens', getSupportedTokens);
router.get('/supported-pairs', getSupportedTradingPairs);
router.get('/status/:exchangeId', getSwapStatus);
router.post('/simulate', simulateSwap);

// Protected routes - optional authentication (works for both anonymous and authenticated users)
router.post('/execute', optionalAuth, executeSwap);

export default router;
