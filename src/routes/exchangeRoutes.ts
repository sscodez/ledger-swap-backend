import { Router } from 'express';
import { createExchange, getExchangeById, updateExchangeStatus } from '../controllers/exchangeController';
import { protect, optionalAuth } from '../middleware/authMiddleware';

const router = Router();

// POST /api/exchanges - Works for both authenticated and anonymous users
// Creates a new exchange and returns { exchangeId, record }
router.post('/', optionalAuth, createExchange);
router.get('/:exchangeId', optionalAuth, getExchangeById);
router.put('/:exchangeId/status', protect, updateExchangeStatus);

export default router;
