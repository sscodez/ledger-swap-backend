import { Request, Response, RequestHandler } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import ExchangeHistory from '../models/ExchangeHistory';
import { checkComprehensiveFlagged } from '../utils/flaggedCheck';

function generateExchangeId() {
  return `EX-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

// POST /api/exchanges
// Creates a new exchange entry and returns server-generated exchangeId (and the created record)
export const createExchange: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { fromCurrency, toCurrency, sendAmount, receiveAmount, fees = 0, cashback = 0, walletAddress, status } = req.body || {};

  if (!fromCurrency || !toCurrency) {
    return res.status(400).json({ message: 'fromCurrency and toCurrency are required' });
  }

  // Check if user or recipient address is flagged
  try {
    const flaggedCheck = await checkComprehensiveFlagged(
      authReq.user!._id.toString(),
      walletAddress
    );

    if (flaggedCheck.isFlagged) {
      return res.status(403).json({
        message: 'Exchange creation blocked due to security restrictions',
        error: 'FLAGGED_USER_OR_ADDRESS',
        details: {
          type: flaggedCheck.type,
          reason: flaggedCheck.reason,
          flaggedAt: flaggedCheck.flaggedAt
        }
      });
    }
  } catch (flagCheckError: any) {
    console.error('Error checking flagged status:', flagCheckError);
    // Log the error but don't block the exchange if the check fails
    // This prevents system errors from blocking legitimate users
  }

  const exchangeId = generateExchangeId();
  const allowedStatuses = new Set(['pending', 'completed', 'failed', 'in_review']);
  const computedStatus = allowedStatuses.has(String(status)) ? (String(status) as any) : 'pending';

  try {
    const record = await ExchangeHistory.create({
      user: authReq.user!._id,
      exchangeId,
      status: computedStatus,
      from: {
        currency: String(fromCurrency),
        amount: Number(sendAmount ?? 0),
      },
      to: {
        currency: String(toCurrency),
        amount: Number(receiveAmount ?? 0),
      },
      fees: Number(fees ?? 0),
      cashback: Number(cashback ?? 0),
      walletAddress: walletAddress ? String(walletAddress) : undefined,
    });

    return res.status(201).json({ exchangeId, record });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to create exchange', error: err?.message || String(err) });
  }
};

// GET /api/exchanges/:exchangeId
export const getExchangeById: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { exchangeId } = req.params as { exchangeId: string };
    const record = await ExchangeHistory.findOne({ exchangeId });
    if (!record) return res.status(404).json({ message: 'Exchange not found' });
    return res.json(record);
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch exchange', error: err?.message || String(err) });
  }
};

// PUT /api/exchanges/:exchangeId/status
export const updateExchangeStatus: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { exchangeId } = req.params as { exchangeId: string };
    const { status } = req.body as { status?: string };
    const allowed = new Set(['pending', 'completed', 'failed', 'in_review']);
    if (!status || !allowed.has(String(status))) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const updated = await ExchangeHistory.findOneAndUpdate(
      { exchangeId },
      { status: String(status) },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Exchange not found' });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to update status', error: err?.message || String(err) });
  }
};
