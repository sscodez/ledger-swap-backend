import { Router } from 'express';
import { createExchange, getExchangeById, updateExchangeStatus } from '../controllers/exchangeController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Create optional auth middleware for exchanges
const optionalAuth = (req: any, res: any, next: any) => {
  // Try to authenticate, but don't fail if no token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, next);
  } else {
    // No authentication provided, continue without user
    next();
  }
};

// POST /api/exchanges
// Creates a new exchange and returns { exchangeId, record }
// Now supports both authenticated and anonymous users
router.post('/', optionalAuth, createExchange);
router.get('/:exchangeId', getExchangeById); // Remove auth requirement for viewing exchanges
router.put('/:exchangeId/status', protect, updateExchangeStatus); // Keep auth for status updates

export default router;
