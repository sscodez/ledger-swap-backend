/**
 * Token Management Controller
 * Admin endpoints for managing tokens on supported chains
 */

import { Request, Response } from 'express';
import Token, { IToken } from '../models/Token';
import Chain from '../models/Chain';

/**
 * Get all tokens
 */
export const getAllTokens = async (req: Request, res: Response) => {
  try {
    const { chainKey, enabled } = req.query;
    
    const filter: any = {};
    if (chainKey) filter.chainKey = chainKey;
    if (enabled !== undefined) filter.enabled = enabled === 'true';
    
    const tokens = await Token.find(filter)
      .sort({ liquidityScore: -1, symbol: 1 });
    
    res.json({
      success: true,
      count: tokens.length,
      tokens
    });
  } catch (error: any) {
    console.error('❌ Error getting tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tokens',
      error: error.message
    });
  }
};

/**
 * Get token by key
 */
export const getTokenByKey = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const token = await Token.findOne({ key });
    
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }
    
    res.json({
      success: true,
      token
    });
  } catch (error: any) {
    console.error('❌ Error getting token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get token',
      error: error.message
    });
  }
};

/**
 * Get tokens by chain
 */
export const getTokensByChain = async (req: Request, res: Response) => {
  try {
    const { chainKey } = req.params;
    
    // Verify chain exists
    const chain = await Chain.findOne({ key: chainKey });
    if (!chain) {
      return res.status(404).json({
        success: false,
        message: 'Chain not found'
      });
    }
    
    const tokens = await Token.find({ chainKey, enabled: true })
      .sort({ liquidityScore: -1, symbol: 1 });
    
    res.json({
      success: true,
      chain: chain.name,
      count: tokens.length,
      tokens
    });
  } catch (error: any) {
    console.error('❌ Error getting tokens by chain:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tokens',
      error: error.message
    });
  }
};

/**
 * Create new token (Admin only)
 */
export const createToken = async (req: Request, res: Response) => {
  try {
    const tokenData = req.body;
    
    // Verify chain exists
    const chain = await Chain.findOne({ key: tokenData.chainKey });
    if (!chain) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chain key'
      });
    }
    
    // Auto-generate key if not provided
    if (!tokenData.key) {
      tokenData.key = `${tokenData.symbol.toLowerCase()}-${tokenData.chainKey}`;
    }
    
    // Check if token already exists
    const existingToken = await Token.findOne({ key: tokenData.key });
    if (existingToken) {
      return res.status(400).json({
        success: false,
        message: 'Token with this key already exists'
      });
    }
    
    const token = await Token.create(tokenData);
    
    res.status(201).json({
      success: true,
      message: 'Token created successfully',
      token
    });
  } catch (error: any) {
    console.error('❌ Error creating token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create token',
      error: error.message
    });
  }
};

/**
 * Update token (Admin only)
 */
export const updateToken = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const updates = req.body;
    
    // Don't allow changing the key or chainKey
    delete updates.key;
    delete updates.chainKey;
    
    const token = await Token.findOneAndUpdate(
      { key },
      updates,
      { new: true, runValidators: true }
    );
    
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Token updated successfully',
      token
    });
  } catch (error: any) {
    console.error('❌ Error updating token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update token',
      error: error.message
    });
  }
};

/**
 * Enable/disable token (Admin only)
 */
export const toggleTokenStatus = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { enabled } = req.body;
    
    const token = await Token.findOneAndUpdate(
      { key },
      { enabled },
      { new: true }
    );
    
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }
    
    res.json({
      success: true,
      message: `Token ${enabled ? 'enabled' : 'disabled'} successfully`,
      token
    });
  } catch (error: any) {
    console.error('❌ Error toggling token status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle token status',
      error: error.message
    });
  }
};

/**
 * Delete token (Admin only)
 */
export const deleteToken = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const token = await Token.findOneAndDelete({ key });
    
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Token deleted successfully',
      token
    });
  } catch (error: any) {
    console.error('❌ Error deleting token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete token',
      error: error.message
    });
  }
};

/**
 * Bulk create tokens (Admin only)
 */
export const bulkCreateTokens = async (req: Request, res: Response) => {
  try {
    const { tokens } = req.body;
    
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tokens array'
      });
    }
    
    // Auto-generate keys
    const processedTokens = tokens.map(token => ({
      ...token,
      key: token.key || `${token.symbol.toLowerCase()}-${token.chainKey}`
    }));
    
    const createdTokens = await Token.insertMany(processedTokens, { ordered: false });
    
    res.status(201).json({
      success: true,
      message: `${createdTokens.length} tokens created successfully`,
      count: createdTokens.length,
      tokens: createdTokens
    });
  } catch (error: any) {
    console.error('❌ Error bulk creating tokens:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Some tokens already exist',
        error: 'Duplicate tokens found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create tokens',
      error: error.message
    });
  }
};

/**
 * Get token statistics
 */
export const getTokenStats = async (req: Request, res: Response) => {
  try {
    const totalTokens = await Token.countDocuments();
    const enabledTokens = await Token.countDocuments({ enabled: true });
    const disabledTokens = totalTokens - enabledTokens;
    
    const tokensByChain = await Token.aggregate([
      { $group: { _id: '$chainKey', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const tokensByType = await Token.aggregate([
      { $group: { _id: '$tokenType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const stablecoins = await Token.countDocuments({ isStablecoin: true });
    
    res.json({
      success: true,
      stats: {
        total: totalTokens,
        enabled: enabledTokens,
        disabled: disabledTokens,
        stablecoins,
        byChain: tokensByChain,
        byType: tokensByType
      }
    });
  } catch (error: any) {
    console.error('❌ Error getting token stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get token statistics',
      error: error.message
    });
  }
};

/**
 * Search tokens
 */
export const searchTokens = async (req: Request, res: Response) => {
  try {
    const { query, chainKey, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query required'
      });
    }
    
    const searchRegex = new RegExp(query as string, 'i');
    const filter: any = {
      enabled: true,
      $or: [
        { symbol: searchRegex },
        { name: searchRegex }
      ]
    };
    
    if (chainKey) {
      filter.chainKey = chainKey;
    }
    
    const tokens = await Token.find(filter)
      .limit(parseInt(limit as string))
      .sort({ liquidityScore: -1 });
    
    res.json({
      success: true,
      count: tokens.length,
      tokens
    });
  } catch (error: any) {
    console.error('❌ Error searching tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search tokens',
      error: error.message
    });
  }
};
