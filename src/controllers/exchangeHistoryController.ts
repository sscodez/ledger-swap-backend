import { Request, Response, RequestHandler } from 'express';
import ExchangeHistory from '../models/ExchangeHistory';
import { AuthRequest } from '../middleware/authMiddleware';

export const createExchangeHistory: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const {
    exchangeId,
    status,
    from,
    to,
    fees,
    cashback,
    sellerTxhash,
    depositAddressSeller,
    prefundTxHash,
    buyerTxhash,
    depositAddressBuyer,
    withdrawalTxId,
    sendAddressSeller,
    sendAddressBuyer,
  } = req.body;

  try {
    const exchangeHistory = await ExchangeHistory.create({
      user: authReq.user!._id,
      exchangeId,
      status,
      from,
      to,
      fees,
      cashback,
      sellerTxhash,
      depositAddressSeller,
      prefundTxHash,
      sendAddressSeller,
    });

    res.status(201).json(exchangeHistory);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const updateExchangeHistory: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;

  try {
    if (!id) {
      return res.status(400).json({ message: 'Exchange history ID is required' });
    }

    const allowedFields = [
      'status',
      'fees',
      'cashback',
      'buyerTxhash',
      'sellerTxhash',
      'depositAddressBuyer',
      'depositAddressSeller',
      'prefundTxHash',
      'withdrawalTxId',
      'sendAddressSeller',
      'sendAddressBuyer',
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }

    const filter: Record<string, unknown> = { _id: id };
    if (authReq.user?._id) {
      filter.user = authReq.user._id;
    }

    const updated = await ExchangeHistory.findOneAndUpdate(filter, updates, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Exchange history entry not found' });
    }

    res.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const getExchangeHistory: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { page = '1', limit = '10', sort = '-createdAt' } = req.query as Record<string, string>;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(Math.min(parseInt(limit, 10) || 10, 100), 1);

    const [items, total] = await Promise.all([
      ExchangeHistory.find({ user: authReq.user!._id })
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      ExchangeHistory.countDocuments({ user: authReq.user!._id }),
    ]);

    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      items,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};
