import { Router } from 'express';
import { createExchange, getExchangeById, updateExchangeStatus } from '../controllers/exchangeController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// POST /api/exchanges
// Creates a new exchange and returns { exchangeId, record }
router.post('/', protect, createExchange);
router.get('/:exchangeId', protect, getExchangeById);
router.put('/:exchangeId/status', protect, updateExchangeStatus);

export default router;
