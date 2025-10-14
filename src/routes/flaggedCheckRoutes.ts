import { Router } from 'express';
import { checkFlaggedAddress } from '../utils/flaggedCheck';

const router = Router();

/**
 * POST /api/flagged-check/address
 * Check if a wallet address is flagged
 * Public endpoint - no authentication required
 */
router.post('/address', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Address is required and must be a string'
      });
    }

    // Validate address format (basic check)
    const trimmedAddress = address.trim();
    if (trimmedAddress.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address format'
      });
    }

    // Check if address is flagged
    const flaggedResult = await checkFlaggedAddress(trimmedAddress);

    return res.json({
      success: true,
      isFlagged: flaggedResult.isFlagged,
      reason: flaggedResult.reason,
      flaggedAt: flaggedResult.flaggedAt,
      type: flaggedResult.type
    });

  } catch (error: any) {
    console.error('Error checking flagged address:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
