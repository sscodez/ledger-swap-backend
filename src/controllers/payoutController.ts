import { Request, Response, RequestHandler } from 'express';
import Payout from '../models/Payout';
import { AuthRequest } from '../middleware/authMiddleware';

export const createPayout: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { amount, payoutAddress, platform, fees } = req.body;

  try {
    const payout = await Payout.create({
      user: authReq.user!._id,
      amount,
      payoutAddress,
      platform,
      fees,
    });

    res.status(201).json(payout);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const getPayouts: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const payouts = await Payout.find({ user: authReq.user!._id });
    res.json(payouts);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};
