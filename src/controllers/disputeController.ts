import { Request, Response, RequestHandler } from 'express';
import Dispute, { DisputeStatus } from '../models/Dispute';
import { AuthRequest } from '../middleware/authMiddleware';

// User: create a dispute
export const createDispute: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { exchangeId, subject, description, attachments } = req.body as {
      exchangeId: string;
      subject: string;
      description: string;
      attachments?: string[];
    };

    if (!exchangeId || !subject || !description) {
      return res.status(400).json({ message: 'exchangeId, subject and description are required' });
    }

    const authReq = req as AuthRequest;
    const dispute = await Dispute.create({
      user: authReq.user!._id,
      exchangeId,
      subject,
      description,
      attachments: attachments || [],
    });

    res.status(201).json(dispute);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create dispute', error: err.message });
  }
};

// User: list my disputes
export const listMyDisputes: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(Math.min(parseInt(limit, 10) || 20, 100), 1);

    const authReq = req as AuthRequest;
    const query: any = { user: authReq.user!._id };
    if (status) query.status = status;

    const [items, total] = await Promise.all([
      Dispute.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Dispute.countDocuments(query),
    ]);

    res.json({ page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum), items });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to list disputes', error: err.message });
  }
};

// User/Admin: get dispute by id (owner or admin)
export const getDisputeById: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dispute = await Dispute.findById(id);
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    const authReq = req as AuthRequest;
    const isOwner = dispute.user.toString() === authReq.user!._id.toString();
    const isAdmin = authReq.user?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Access denied' });

    res.json(dispute);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to get dispute', error: err.message });
  }
};

// User/Admin: add message to a dispute (owner or admin)
export const addMessageToDispute: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body as { message: string };

    if (!message) return res.status(400).json({ message: 'message is required' });

    const dispute = await Dispute.findById(id);
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    const authReq = req as AuthRequest;
    const isOwner = dispute.user.toString() === String(authReq.user!._id);
    const isAdmin = authReq.user?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Access denied' });

    dispute.messages.push({ senderType: isAdmin ? 'admin' : 'user', message });
    await dispute.save();

    res.json(dispute);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to add message', error: err.message });
  }
};

// Admin: list disputes with filters
export const adminListDisputes: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, exchangeId, user } = req.query as Record<string, string>;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(Math.min(parseInt(limit, 10) || 20, 100), 1);

    const query: any = {};
    if (status) query.status = status;
    if (exchangeId) query.exchangeId = exchangeId;
    if (user) query.user = user;

    const [items, total] = await Promise.all([
      Dispute.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Dispute.countDocuments(query),
    ]);

    res.json({ page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum), items });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to list disputes', error: err.message });
  }
};

// Admin: update dispute status
export const adminUpdateDisputeStatus: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: DisputeStatus };

    if (!['open', 'in_review', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const dispute = await Dispute.findByIdAndUpdate(id, { status }, { new: true });
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    res.json(dispute);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update dispute status', error: err.message });
  }
};

// Admin: reply to a dispute (adds message as admin)
export const adminReplyToDispute: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body as { message: string };
    if (!message) return res.status(400).json({ message: 'message is required' });

    const dispute = await Dispute.findById(id);
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    dispute.messages.push({ senderType: 'admin', message });
    await dispute.save();

    res.json(dispute);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to reply to dispute', error: err.message });
  }
};
