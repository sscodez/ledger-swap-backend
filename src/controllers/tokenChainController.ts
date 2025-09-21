import { Request, Response } from 'express';
import Chain from '../models/Chain';
import Token from '../models/Token';

// Chains
export const listChains = async (req: Request, res: Response) => {
  try {
    const items = await Chain.find({}).sort({ name: 1 });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to list chains', error: err.message });
  }
};

export const createChain = async (req: Request, res: Response) => {
  try {
    const { key, name, enabled } = req.body as { key?: string; name?: string; enabled?: boolean };
    if (!key || !name) {
      return res.status(400).json({ message: 'key and name are required' });
    }
    const normKey = key.toLowerCase().trim();
    const exists = await Chain.findOne({ key: normKey });
    if (exists) {
      return res.status(409).json({ message: 'Chain already exists' });
    }
    const chain = await Chain.create({ key: normKey, name: name.trim(), enabled: enabled !== undefined ? !!enabled : true });
    res.status(201).json(chain);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create chain', error: err.message });
  }
};

export const createToken = async (req: Request, res: Response) => {
  try {
    const { symbol, name, chainKey, enabled } = req.body as {
      symbol?: string;
      name?: string;
      chainKey?: string;
      enabled?: boolean;
    };

    if (!symbol || !name || !chainKey) {
      return res.status(400).json({ message: 'symbol, name and chainKey are required' });
    }

    // ensure chain exists
    const chain = await Chain.findOne({ key: chainKey });
    if (!chain) {
      return res.status(404).json({ message: 'Chain not found' });
    }

    const key = `${symbol.toLowerCase()}-${chainKey.toLowerCase()}`;
    const existing = await Token.findOne({ key });
    if (existing) {
      return res.status(409).json({ message: 'Token already exists for this chain' });
    }

    const token = await Token.create({ key, symbol, name, chainKey, enabled: enabled !== undefined ? !!enabled : true });
    res.status(201).json(token);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create token', error: err.message });
  }
};

export const setChainEnabled = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { enabled } = req.body as { enabled: boolean };
    const chain = await Chain.findOneAndUpdate({ key }, { enabled }, { new: true, upsert: false });
    if (!chain) return res.status(404).json({ message: 'Chain not found' });
    res.json(chain);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update chain', error: err.message });
  }
};

// Tokens
export const listTokens = async (req: Request, res: Response) => {
  try {
    const { chainKey } = req.query as { chainKey?: string };
    const query: any = {};
    if (chainKey) query.chainKey = chainKey;
    const items = await Token.find(query).sort({ symbol: 1 });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to list tokens', error: err.message });
  }
};

export const setTokenEnabled = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { enabled } = req.body as { enabled: boolean };
    const token = await Token.findOneAndUpdate({ key }, { enabled }, { new: true, upsert: false });
    if (!token) return res.status(404).json({ message: 'Token not found' });
    res.json(token);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update token', error: err.message });
  }
};
