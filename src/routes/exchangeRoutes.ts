import { Router } from 'express';
import { createExchange, getExchangeById, updatedExchange, updateExchangeStatus, getPublicExchanges, completeExchange } from '../controllers/exchangeController';
import { protect, optionalAuth } from '../middleware/authMiddleware';

const router = Router();

// POST /api/exchanges - Works for both authenticated and anonymous users
// Creates a new exchange and returns { exchangeId, record }
router.post('/', optionalAuth, createExchange);
router.get('/public', getPublicExchanges);
router.get('/:exchangeId', optionalAuth, getExchangeById);
router.patch('/:exchangeId', protect, updatedExchange);
router.post('/:exchangeId/complete', optionalAuth, completeExchange);
router.put('/:exchangeId/status', protect, updateExchangeStatus);

export default router;
