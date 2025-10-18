/**
 * Chain Management Controller
 * Admin endpoints for managing supported blockchains
 */

import { Request, Response } from 'express';
import Chain, { IChain } from '../models/Chain';

/**
 * Get all chains
 */
export const getAllChains = async (req: Request, res: Response) => {
  try {
    const chains = await Chain.find().sort({ name: 1 });
    
    res.json({
      success: true,
      count: chains.length,
      chains
    });
  } catch (error: any) {
    console.error('❌ Error getting chains:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chains',
      error: error.message
    });
  }
};

/**
 * Get chain by key
 */
export const getChainByKey = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const chain = await Chain.findOne({ key });
    
    if (!chain) {
      return res.status(404).json({
        success: false,
        message: 'Chain not found'
      });
    }
    
    res.json({
      success: true,
      chain
    });
  } catch (error: any) {
    console.error('❌ Error getting chain:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chain',
      error: error.message
    });
  }
};

/**
 * Create new chain (Admin only)
 */
export const createChain = async (req: Request, res: Response) => {
  try {
    const chainData = req.body;
    
    // Check if chain already exists
    const existingChain = await Chain.findOne({ key: chainData.key });
    if (existingChain) {
      return res.status(400).json({
        success: false,
        message: 'Chain with this key already exists'
      });
    }
    
    const chain = await Chain.create(chainData);
    
    res.status(201).json({
      success: true,
      message: 'Chain created successfully',
      chain
    });
  } catch (error: any) {
    console.error('❌ Error creating chain:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chain',
      error: error.message
    });
  }
};

/**
 * Update chain (Admin only)
 */
export const updateChain = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const updates = req.body;
    
    // Don't allow changing the key
    delete updates.key;
    
    const chain = await Chain.findOneAndUpdate(
      { key },
      updates,
      { new: true, runValidators: true }
    );
    
    if (!chain) {
      return res.status(404).json({
        success: false,
        message: 'Chain not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Chain updated successfully',
      chain
    });
  } catch (error: any) {
    console.error('❌ Error updating chain:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chain',
      error: error.message
    });
  }
};

/**
 * Enable/disable chain (Admin only)
 */
export const toggleChainStatus = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { enabled } = req.body;
    
    const chain = await Chain.findOneAndUpdate(
      { key },
      { enabled },
      { new: true }
    );
    
    if (!chain) {
      return res.status(404).json({
        success: false,
        message: 'Chain not found'
      });
    }
    
    res.json({
      success: true,
      message: `Chain ${enabled ? 'enabled' : 'disabled'} successfully`,
      chain
    });
  } catch (error: any) {
    console.error('❌ Error toggling chain status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle chain status',
      error: error.message
    });
  }
};

/**
 * Delete chain (Admin only)
 */
export const deleteChain = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const chain = await Chain.findOneAndDelete({ key });
    
    if (!chain) {
      return res.status(404).json({
        success: false,
        message: 'Chain not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Chain deleted successfully',
      chain
    });
  } catch (error: any) {
    console.error('❌ Error deleting chain:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chain',
      error: error.message
    });
  }
};

/**
 * Get chain statistics
 */
export const getChainStats = async (req: Request, res: Response) => {
  try {
    const totalChains = await Chain.countDocuments();
    const enabledChains = await Chain.countDocuments({ enabled: true });
    const disabledChains = totalChains - enabledChains;
    
    const chainsByType = await Chain.aggregate([
      { $group: { _id: '$chainType', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      stats: {
        total: totalChains,
        enabled: enabledChains,
        disabled: disabledChains,
        byType: chainsByType
      }
    });
  } catch (error: any) {
    console.error('❌ Error getting chain stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chain statistics',
      error: error.message
    });
  }
};
