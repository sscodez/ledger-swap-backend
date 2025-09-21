import { Request, Response, RequestHandler } from 'express';
import ExchangeHistory from '../models/ExchangeHistory';
import { AuthRequest } from '../middleware/authMiddleware';

export const createExchangeHistory: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { exchangeId, status, from, to, fees, cashback } = req.body;

  try {
    const exchangeHistory = await ExchangeHistory.create({
      user: authReq.user!._id,
      exchangeId,
      status,
      from,
      to,
      fees,
      cashback,
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

export const getExchangeHistory: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const exchangeHistory = await ExchangeHistory.find({ user: authReq.user!._id });
    res.json(exchangeHistory);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};
