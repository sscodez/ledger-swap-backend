import { Request, Response } from 'express';
import CryptoFee, { ICryptoFee } from '../models/CryptoFee';

// Get all crypto fees
export const getAllCryptoFees = async (req: Request, res: Response) => {
  try {
    const fees = await CryptoFee.find().sort({ cryptocurrency: 1 });
    res.json({
      success: true,
      data: fees
    });
  } catch (error) {
    console.error('Error fetching crypto fees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch crypto fees',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get crypto fee by ID
export const getCryptoFeeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fee = await CryptoFee.findById(id);
    
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Crypto fee not found'
      });
    }

    res.json({
      success: true,
      data: fee
    });
  } catch (error) {
    console.error('Error fetching crypto fee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch crypto fee',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get crypto fee by symbol
export const getCryptoFeeBySymbol = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const fee = await CryptoFee.findOne({ symbol: symbol.toUpperCase(), isActive: true });
    
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Crypto fee not found for symbol'
      });
    }

    res.json({
      success: true,
      data: fee
    });
  } catch (error) {
    console.error('Error fetching crypto fee by symbol:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch crypto fee',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new crypto fee
export const createCryptoFee = async (req: Request, res: Response) => {
  try {
    const { cryptocurrency, symbol, feePercentage, minimumFee, maximumFee, feeCollectionAddress, isActive } = req.body;

    // Validate required fields
    if (!cryptocurrency || !symbol || feePercentage === undefined || minimumFee === undefined || maximumFee === undefined || !feeCollectionAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if crypto fee already exists
    const existingFee = await CryptoFee.findOne({
      $or: [
        { cryptocurrency },
        { symbol: symbol.toUpperCase() }
      ]
    });

    if (existingFee) {
      return res.status(409).json({
        success: false,
        message: 'Crypto fee already exists for this cryptocurrency or symbol'
      });
    }

    const newFee = new CryptoFee({
      cryptocurrency,
      symbol: symbol.toUpperCase(),
      feePercentage,
      minimumFee,
      maximumFee,
      feeCollectionAddress,
      isActive: isActive !== undefined ? isActive : true
    });

    const savedFee = await newFee.save();

    res.status(201).json({
      success: true,
      message: 'Crypto fee created successfully',
      data: savedFee
    });
  } catch (error) {
    console.error('Error creating crypto fee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create crypto fee',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update crypto fee
export const updateCryptoFee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cryptocurrency, symbol, feePercentage, minimumFee, maximumFee, feeCollectionAddress, isActive } = req.body;

    const fee = await CryptoFee.findById(id);
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Crypto fee not found'
      });
    }

    // Check for duplicate if changing cryptocurrency or symbol
    if (cryptocurrency !== fee.cryptocurrency || symbol !== fee.symbol) {
      const existingFee = await CryptoFee.findOne({
        _id: { $ne: id },
        $or: [
          { cryptocurrency },
          { symbol: symbol?.toUpperCase() }
        ]
      });

      if (existingFee) {
        return res.status(409).json({
          success: false,
          message: 'Another crypto fee already exists for this cryptocurrency or symbol'
        });
      }
    }

    // Update fields
    if (cryptocurrency !== undefined) fee.cryptocurrency = cryptocurrency;
    if (symbol !== undefined) fee.symbol = symbol.toUpperCase();
    if (feePercentage !== undefined) fee.feePercentage = feePercentage;
    if (minimumFee !== undefined) fee.minimumFee = minimumFee;
    if (maximumFee !== undefined) fee.maximumFee = maximumFee;
    if (feeCollectionAddress !== undefined) fee.feeCollectionAddress = feeCollectionAddress;
    if (isActive !== undefined) fee.isActive = isActive;

    const updatedFee = await fee.save();

    res.json({
      success: true,
      message: 'Crypto fee updated successfully',
      data: updatedFee
    });
  } catch (error) {
    console.error('Error updating crypto fee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update crypto fee',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete crypto fee
export const deleteCryptoFee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const fee = await CryptoFee.findById(id);
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Crypto fee not found'
      });
    }

    await CryptoFee.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Crypto fee deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting crypto fee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete crypto fee',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Toggle crypto fee status
export const toggleCryptoFeeStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const fee = await CryptoFee.findById(id);
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Crypto fee not found'
      });
    }

    fee.isActive = !fee.isActive;
    const updatedFee = await fee.save();

    res.json({
      success: true,
      message: `Crypto fee ${updatedFee.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedFee
    });
  } catch (error) {
    console.error('Error toggling crypto fee status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle crypto fee status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Calculate fee for a given amount and cryptocurrency
export const calculateFee = async (req: Request, res: Response) => {
  try {
    const { symbol, amount } = req.params;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount provided'
      });
    }

    const fee = await CryptoFee.findOne({ symbol: symbol.toUpperCase(), isActive: true });
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Crypto fee not found for symbol'
      });
    }

    // Calculate percentage fee
    let calculatedFee = (numAmount * fee.feePercentage) / 100;

    // Apply minimum and maximum limits
    calculatedFee = Math.max(calculatedFee, fee.minimumFee);
    calculatedFee = Math.min(calculatedFee, fee.maximumFee);

    res.json({
      success: true,
      data: {
        cryptocurrency: fee.cryptocurrency,
        symbol: fee.symbol,
        amount: numAmount,
        feePercentage: fee.feePercentage,
        calculatedFee,
        minimumFee: fee.minimumFee,
        maximumFee: fee.maximumFee,
        netAmount: numAmount - calculatedFee
      }
    });
  } catch (error) {
    console.error('Error calculating fee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate fee',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
