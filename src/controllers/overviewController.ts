import { Request, Response, RequestHandler } from 'express';
import Overview from '../models/Overview';
import { AuthRequest } from '../middleware/authMiddleware';

export const getOverview: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const overview = await Overview.findOne({ user: authReq.user!._id });

    if (overview) {
      res.json(overview);
    } else {
      res.status(404).json({ message: 'Overview not found' });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};
