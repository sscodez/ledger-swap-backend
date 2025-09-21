import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import SupportMessage from '../models/SupportMessage';
import User from '../models/User';
import ExchangeHistory from '../models/ExchangeHistory';
import Address from '../models/Address';
import PlatformSettings from '../models/PlatformSettings';

export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to list users', error: err.message });
  }
};

// Admin: flag a wallet address (create or update)
export const adminFlagAddress = async (req: Request, res: Response) => {
  try {
    const { coin, network, address, reason } = req.body as {
      coin?: string;
      network?: string;
      address?: string;
      reason?: string;
    };
    if (!coin || !network || !address) {
      return res.status(400).json({ message: 'coin, network, and address are required' });
    }

    const authReq = req as AuthRequest;
    const now = new Date();
    const update: any = {
      coin,
      network,
      address,
      label: 'flagged',
      flagged: true,
      flaggedAt: now,
    };
    if (reason) update.flaggedReason = reason;
    // attach the admin user as creator/owner to satisfy schema requirement
    if (authReq.user?._id) update.user = authReq.user._id;

    // Upsert by unique address
    const doc = await Address.findOneAndUpdate(
      { address },
      { $set: update },
      { new: true, upsert: true }
    );

    res.status(201).json(doc);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to flag address', error: err.message });
  }
};

// Send support email (admin -> support mailbox)
export const sendSupportEmail = async (req: Request, res: Response) => {
  try {
    const { subject, message, fromEmail } = req.body as {
      subject?: string;
      message?: string;
      fromEmail?: string;
    };

    if (!subject || !message) {
      return res.status(400).json({ message: 'subject and message are required' });
    }

    const to = process.env.SUPPORT_EMAIL || 'support@ledgerswap.io';
    const from = fromEmail || process.env.SUPPORT_FROM_EMAIL || 'no-reply@ledgerswap.io';

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Attempt to send via nodemailer if SMTP is configured
    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      try {
        // Dynamically import nodemailer to avoid hard dependency if not installed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465, // true for 465, false for other ports
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from,
          to,
          subject: `[Admin Support] ${subject}`,
          text: message,
        });

        // Save record as sent
        const authReq = req as AuthRequest;
        await SupportMessage.create({
          subject,
          message,
          fromEmail,
          toEmail: to,
          status: 'sent',
          createdBy: authReq.user?._id,
        });

        return res.status(200).json({ message: 'Support email sent' });
      } catch (mailErr: any) {
        console.error('Failed to send support email via SMTP:', mailErr?.message || mailErr);
        // Save record as failed, then fall through to accepted/log
        const authReq = req as AuthRequest;
        try {
          await SupportMessage.create({
            subject,
            message,
            fromEmail,
            toEmail: to,
            status: 'failed',
            error: mailErr?.message || String(mailErr),
            createdBy: authReq.user?._id,
          });
        } catch (e) {
          console.error('Failed to save failed support message record:', (e as any)?.message || e);
        }
      }
    }

    console.log('Support email request (SMTP not configured). To:', to, 'From:', from, 'Subject:', subject);
    // Save record as accepted (not actually sent)
    const authReq = req as AuthRequest;
    await SupportMessage.create({
      subject,
      message,
      fromEmail,
      toEmail: to,
      status: 'accepted',
      createdBy: authReq.user?._id,
    });
    return res.status(202).json({ message: 'Support request accepted (email delivery not configured on server)' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to process support email', error: err.message });
  }
};

// List support messages (admin)
export const listSupportMessages = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', sort = '-createdAt' } = req.query as Record<string, string>;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(Math.min(parseInt(limit, 10) || 20, 100), 1);

    const [items, total] = await Promise.all([
      SupportMessage.find({}).sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum),
      SupportMessage.countDocuments({}),
    ]);

    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      items,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to list support messages', error: err.message });
  }
};

// Update general platform settings (partial update)
export const updatePlatformSettings = async (req: Request, res: Response) => {
  try {
    const { privacyMode, autoRefreshDashboard, notificationSettings, loginRateLimitPerHour } = req.body as {
      privacyMode?: boolean;
      autoRefreshDashboard?: boolean;
      notificationSettings?: { alertsEnabled?: boolean };
      loginRateLimitPerHour?: number;
    };

    const updates: any = {};
    if (typeof privacyMode === 'boolean') updates.privacyMode = privacyMode;
    if (typeof autoRefreshDashboard === 'boolean') updates.autoRefreshDashboard = autoRefreshDashboard;
    if (notificationSettings && typeof notificationSettings.alertsEnabled === 'boolean') {
      updates['notificationSettings.alertsEnabled'] = notificationSettings.alertsEnabled;
    }
    if (typeof loginRateLimitPerHour === 'number' && loginRateLimitPerHour >= 0) {
      updates.loginRateLimitPerHour = Math.floor(loginRateLimitPerHour);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid settings provided' });
    }

    const updated = await PlatformSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update platform settings', error: err.message });
  }
};

// Trade Activity Monitor: list swaps with Wallet address, Swap details, Network, Status, Time
export const listTradeActivity = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      walletAddress,
      network,
      status,
      startDate,
      endDate,
      sort = '-createdAt',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.max(Math.min(parseInt(limit as string, 10) || 20, 100), 1);

    const query: any = {};
    if (walletAddress) query.walletAddress = { $regex: walletAddress, $options: 'i' };
    if (network) query.network = network;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      ExchangeHistory.find(query)
        .select('walletAddress from to network status createdAt')
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      ExchangeHistory.countDocuments(query),
    ]);

    // Map to required shape (explicit naming)
    const mapped = items.map((it: any) => ({
      walletAddress: it.walletAddress || null,
      swap: { from: it.from, to: it.to },
      network: it.network || null,
      status: it.status,
      time: it.createdAt,
    }));

    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      items: mapped,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to list trade activity', error: err.message });
  }
};

// Get platform settings (swap fee percent)
export const getPlatformSettings = async (req: Request, res: Response) => {
  try {
    const doc = await PlatformSettings.findOne({ key: 'default' });
    res.json(doc || { key: 'default', swapFeePercent: 0, privacyMode: false, autoRefreshDashboard: false, notificationSettings: { alertsEnabled: false }, loginRateLimitPerHour: 5 });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to get settings', error: err.message });
  }
};

// Update platform swap fee percent (0 to 100)
export const updateSwapFeePercent = async (req: Request, res: Response) => {
  try {
    const { swapFeePercent } = req.body as { swapFeePercent: number };
    if (typeof swapFeePercent !== 'number' || swapFeePercent < 0 || swapFeePercent > 100) {
      return res.status(400).json({ message: 'swapFeePercent must be a number between 0 and 100' });
    }
    const updated = await PlatformSettings.findOneAndUpdate(
      { key: 'default' },
      { swapFeePercent },
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update swap fee', error: err.message });
  }
};

// Get fee revenue (last N days, default 30) grouped by day
export const getFeeRevenueLastNDays = async (req: Request, res: Response) => {
  try {
    const daysParam = parseInt((req.query.days as string) || '30', 10);
    const days = isNaN(daysParam) ? 30 : Math.min(Math.max(daysParam, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const agg = await ExchangeHistory.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, totalFees: { $sum: '$fees' } } },
      { $sort: { _id: 1 } },
    ]);

    const map: Record<string, number> = {};
    agg.forEach((d: any) => { map[d._id] = d.totalFees; });
    const result: { date: string; totalFees: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, totalFees: map[key] || 0 });
    }

    res.json({ days, since: since.toISOString(), items: result });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to compute fee revenue', error: err.message });
  }
};

// Admin metrics: Recent Swaps, Total Swaps Today, Volume (24h), Active Users (24h), Platform Fees (24h & total)
export const getAdminMetrics = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Total swaps today (completed)
    const totalSwapsToday = await ExchangeHistory.countDocuments({
      status: 'completed',
      createdAt: { $gte: startOfDay },
    });

    // Active users in last 24h (any status)
    const activeUsersAgg = await ExchangeHistory.aggregate([
      { $match: { createdAt: { $gte: since24h } } },
      { $group: { _id: '$user' } },
      { $count: 'count' },
    ]);
    const activeUsers24h = activeUsersAgg[0]?.count || 0;

    // Volume (24h): sum of "to.amount" for completed swaps in last 24h
    const volume24hAgg = await ExchangeHistory.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: since24h } } },
      { $group: { _id: null, total: { $sum: '$to.amount' } } },
    ]);
    const volume24h = volume24hAgg[0]?.total || 0;

    // Platform fees (24h) and total
    const fees24hAgg = await ExchangeHistory.aggregate([
      { $match: { createdAt: { $gte: since24h } } },
      { $group: { _id: null, total: { $sum: '$fees' } } },
    ]);
    const fees24h = fees24hAgg[0]?.total || 0;

    const feesTotalAgg = await ExchangeHistory.aggregate([
      { $group: { _id: null, total: { $sum: '$fees' } } },
    ]);
    const feesTotal = feesTotalAgg[0]?.total || 0;

    // Recent swaps (latest 10)
    const recentSwaps = await ExchangeHistory.find({})
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      totals: {
        totalSwapsToday,
        activeUsers24h,
        volume24h,
        fees24h,
        feesTotal,
      },
      recentSwaps,
      window: {
        startOfDay: startOfDay.toISOString(),
        since24h: since24h.toISOString(),
        now: now.toISOString(),
      },
      notes: 'Volume is computed as sum of to.amount for completed swaps in the last 24h.'
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to compute metrics', error: err.message });
  }
};

// List flagged wallet addresses only (no user PII)
export const listFlaggedAddresses = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      coin,
      network,
      q, // search in address
      sort = '-flaggedAt',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.max(Math.min(parseInt(limit as string, 10) || 20, 100), 1);

    const query: any = { flagged: true };
    if (coin) query.coin = coin;
    if (network) query.network = network;
    if (q) query.address = { $regex: q, $options: 'i' };

    const [items, total] = await Promise.all([
      Address.find(query)
        .select('address coin network flaggedReason flaggedAt createdAt updatedAt')
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Address.countDocuments(query),
    ]);

    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      items,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to list flagged addresses', error: err.message });
  }
};

export const listAllTransactions = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      user,
      sort = '-createdAt',
      startDate,
      endDate,
    } = req.query as Record<string, string>;

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.max(Math.min(parseInt(limit as string, 10) || 20, 100), 1);

    const query: any = {};
    if (status) query.status = status;
    if (user) query.user = user;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      ExchangeHistory.find(query)
        .populate('user', 'name email role')
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      ExchangeHistory.countDocuments(query),
    ]);

    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      items,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to list transactions', error: err.message });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body as { role: 'user' | 'admin' };

    if (!role || (role !== 'user' && role !== 'admin')) {
      return res.status(400).json({ message: 'Invalid role. Must be "user" or "admin"' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    const sanitized = await User.findById(id).select('-password');
    res.json({ message: 'Role updated', user: sanitized });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update role', error: err.message });
  }
};

// Token and Chain Management Controllers

// Mock data for chains and tokens (replace with actual database models)
const mockChains = [
  { key: 'ethereum', name: 'Ethereum', enabled: true },
  { key: 'bitcoin', name: 'Bitcoin', enabled: true },
  { key: 'solana', name: 'Solana', enabled: true },
  { key: 'binance-smart-chain', name: 'Binance Smart Chain', enabled: true },
  { key: 'polygon', name: 'Polygon', enabled: true },
  { key: 'avalanche', name: 'Avalanche', enabled: false },
  { key: 'cardano', name: 'Cardano', enabled: false },
  { key: 'polkadot', name: 'Polkadot', enabled: false },
  { key: 'tron', name: 'Tron', enabled: true },
  { key: 'xdc-network', name: 'XDC Network', enabled: false },
];

let mockTokens: any[] = [
  { key: 'btc-bitcoin', symbol: 'BTC', name: 'Bitcoin', chainKey: 'bitcoin', enabled: true },
  { key: 'eth-ethereum', symbol: 'ETH', name: 'Ethereum', chainKey: 'ethereum', enabled: true },
  { key: 'usdt-ethereum', symbol: 'USDT', name: 'Tether', chainKey: 'ethereum', enabled: true },
  { key: 'usdt-tron', symbol: 'USDT', name: 'Tether', chainKey: 'tron', enabled: true },
  { key: 'sol-solana', symbol: 'SOL', name: 'Solana', chainKey: 'solana', enabled: true },
];

export const adminListChains = async (req: Request, res: Response) => {
  try {
    res.json(mockChains);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to list chains', error: err.message });
  }
};

export const adminSetChainEnabled = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { enabled } = req.body as { enabled: boolean };

    const chain = mockChains.find(c => c.key === key);
    if (!chain) {
      return res.status(404).json({ message: 'Chain not found' });
    }

    chain.enabled = enabled;
    res.json(chain);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update chain', error: err.message });
  }
};

export const adminListTokens = async (req: Request, res: Response) => {
  try {
    res.json(mockTokens);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to list tokens', error: err.message });
  }
};

export const adminSetTokenEnabled = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { enabled } = req.body as { enabled: boolean };

    const token = mockTokens.find(t => t.key === key);
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    token.enabled = enabled;
    res.json(token);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update token', error: err.message });
  }
};

export const adminCreateToken = async (req: Request, res: Response) => {
  try {
    const { symbol, name, chainKey, enabled = true } = req.body as {
      symbol: string;
      name: string;
      chainKey: string;
      enabled?: boolean;
    };

    if (!symbol || !name || !chainKey) {
      return res.status(400).json({ message: 'symbol, name, and chainKey are required' });
    }

    // Check if chain exists
    const chain = mockChains.find(c => c.key === chainKey);
    if (!chain) {
      return res.status(400).json({ message: 'Chain not found' });
    }

    // Generate a unique key for the token
    const tokenKey = `${symbol.toLowerCase()}-${chainKey}`;
    
    // Check if token already exists
    const existingToken = mockTokens.find(t => t.key === tokenKey);
    if (existingToken) {
      return res.status(400).json({ message: 'Token already exists on this chain' });
    }

    const newToken = {
      key: tokenKey,
      symbol: symbol.toUpperCase(),
      name,
      chainKey,
      enabled,
    };

    mockTokens.push(newToken);
    res.status(201).json(newToken);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create token', error: err.message });
  }
};
