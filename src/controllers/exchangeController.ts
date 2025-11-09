import { Request, Response, RequestHandler } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import ExchangeHistory from '../models/ExchangeHistory';
import { checkComprehensiveFlagged } from '../utils/flaggedCheck';

function generateExchangeId() {
  return `EX-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

// POST /api/exchanges
// Creates a new exchange entry and returns server-generated exchangeId (and the created record)
// Now supports both authenticated and anonymous users
export const createExchange: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const {
    fromCurrency,
    toCurrency,
    sendAmount,
    receiveAmount,
    fees = 0,
    cashback = 0,
    walletAddress,
    status,
    isAnonymous,
    connectedWallet,
    sellerTxhash,
    depositAddressSeller,
    sendAddressSeller,
    prefundTxHash,
  } = req.body || {};

  if (!fromCurrency || !toCurrency) {
    return res.status(400).json({ message: 'fromCurrency and toCurrency are required' });
  }

  // Determine if this should be an anonymous exchange
  const shouldBeAnonymous = isAnonymous || !authReq.user;

  // Check if user or addresses are flagged
  if (authReq.user && !shouldBeAnonymous) {
    // For authenticated users, check user and addresses
    try {
      const flaggedCheck = await checkComprehensiveFlagged(
        authReq.user._id.toString(),
        walletAddress
      );

      if (flaggedCheck.isFlagged) {
        return res.status(403).json({
          message: 'Exchange creation blocked due to security restrictions',
          error: 'FLAGGED_USER_OR_ADDRESS',
          details: {
            type: flaggedCheck.type,
            reason: flaggedCheck.reason,
            flaggedAt: flaggedCheck.flaggedAt
          }
        });
      }
    } catch (flagCheckError: any) {
      console.error('Error checking flagged status:', flagCheckError);
      // Log the error but don't block the exchange if the check fails
      // This prevents system errors from blocking legitimate users
    }
  } else if (shouldBeAnonymous && (connectedWallet || walletAddress)) {
    // For anonymous users, check connected wallet and recipient address
    try {
      // Check connected wallet if provided
      if (connectedWallet) {
        const connectedWalletCheck = await checkComprehensiveFlagged(null, connectedWallet);
        if (connectedWalletCheck.isFlagged) {
          return res.status(403).json({
            message: 'Exchange creation blocked: Connected wallet is flagged',
            error: 'FLAGGED_CONNECTED_WALLET',
            details: {
              type: 'connected_wallet',
              reason: connectedWalletCheck.reason,
              flaggedAt: connectedWalletCheck.flaggedAt
            }
          });
        }
      }

      // Check recipient address
      if (walletAddress) {
        const recipientCheck = await checkComprehensiveFlagged(null, walletAddress);
        if (recipientCheck.isFlagged) {
          return res.status(403).json({
            message: 'Exchange creation blocked: Recipient address is flagged',
            error: 'FLAGGED_RECIPIENT_ADDRESS',
            details: {
              type: 'recipient_address',
              reason: recipientCheck.reason,
              flaggedAt: recipientCheck.flaggedAt
            }
          });
        }
      }
    } catch (flagCheckError: any) {
      console.error('Error checking flagged status for anonymous exchange:', flagCheckError);
      // Log the error but don't block the exchange if the check fails
    }
  }

  const exchangeId = generateExchangeId();
  const allowedStatuses = new Set(['pending', 'completed', 'failed', 'in_review', 'expired', 'processing', 'confirming', 'exchanging', 'sending']);
  const computedStatus = allowedStatuses.has(String(status)) ? (String(status) as any) : 'pending';

  try {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const record = await ExchangeHistory.create({
      user: shouldBeAnonymous ? null : authReq.user!._id,
      isAnonymous: shouldBeAnonymous,
      exchangeId,
      status: computedStatus,
      from: {
        currency: String(fromCurrency),
        amount: Number(sendAmount ?? 0),
      },
      to: {
        currency: String(toCurrency),
        amount: Number(receiveAmount ?? 0),
      },
      fees: Number(fees ?? 0),
      cashback: Number(cashback ?? 0),
      walletAddress: walletAddress ? String(walletAddress) : undefined,
      connectedWallet: connectedWallet ? String(connectedWallet) : undefined,
      sellerTxhash: sellerTxhash ? String(sellerTxhash) : undefined,
      depositAddressSeller: depositAddressSeller ? String(depositAddressSeller) : undefined,
      sendAddressSeller: sendAddressSeller ? String(sendAddressSeller) : undefined,
      prefundTxHash: prefundTxHash ? String(prefundTxHash) : undefined,
      depositReceived: false,
      swapCompleted: false,
      expiresAt,
      monitoringActive: false,
    });

    return res.status(201).json({ 
      exchangeId, 
      record,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to create exchange', error: err?.message || String(err) });
  }
};

// GET /api/exchanges/:exchangeId
export const getExchangeById: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { exchangeId } = req.params as { exchangeId: string };
    const record = await ExchangeHistory.findOne({ exchangeId });
    if (!record) return res.status(404).json({ message: 'Exchange not found' });
    return res.json(record);
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch exchange', error: err?.message || String(err) });
  }
};

// PUT /api/exchanges/:exchangeId/status
export const updateExchangeStatus: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { exchangeId } = req.params as { exchangeId: string };
    const { status, depositTxId, withdrawalTxId, depositAmount, prefundTxHash } = req.body;
    const allowed = new Set(['pending', 'completed', 'failed', 'in_review', 'expired', 'processing', 'confirming', 'exchanging', 'sending']);
    if (!status || !allowed.has(String(status))) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const updateData: any = { status: String(status) };
    
    if (depositTxId) updateData.depositTxId = depositTxId;
    if (withdrawalTxId) updateData.withdrawalTxId = withdrawalTxId;
    if (depositAmount !== undefined) updateData.depositAmount = Number(depositAmount);
    if (prefundTxHash) updateData.prefundTxHash = prefundTxHash;
    
    // Update monitoring and completion flags based on status
    if (status === 'processing' || status === 'confirming' || status === 'exchanging' || status === 'sending') {
      updateData.depositReceived = true;
    } else if (status === 'completed') {
      updateData.swapCompleted = true;
      updateData.monitoringActive = false;
    } else if (status === 'failed' || status === 'expired') {
      updateData.monitoringActive = false;
    }
    
    const updated = await ExchangeHistory.findOneAndUpdate(
      { exchangeId },
      updateData,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Exchange not found' });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to update status', error: err?.message || String(err) });
  }
};

// GET /api/exchanges/public
// Get all public exchanges with optional filtering and pagination
export const getPublicExchanges: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { sendCurrency, receiveCurrency, status, page = '1', limit = '10' } = req.query;
    
    // Build filter object
    const filter: any = {};
    
    if (sendCurrency) {
      filter['from.currency'] = sendCurrency;
    }
    
    if (receiveCurrency) {
      filter['to.currency'] = receiveCurrency;
    }
    
    if (status) {
      filter.status = status;
    }
    
    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination
    const totalCount = await ExchangeHistory.countDocuments(filter);
    
    // Get exchanges, sorted by creation date (newest first)
    const exchanges = await ExchangeHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Transform to match frontend interface
    const transformedExchanges = exchanges.map(exchange => ({
      _id: exchange._id,
      exchangeId: exchange.exchangeId,
      sendAmount: exchange.from.amount,
      sendCurrency: exchange.from.currency,
      receiveCurrency: exchange.to.currency,
      receiveAmount: exchange.to.amount,
      walletAddress: exchange.walletAddress,
      status: exchange.status || 'pending',
      createdAt: exchange.createdAt,
      isAnonymous: exchange.isAnonymous || false,
      connectedWallet: exchange.connectedWallet,
      prefundTxHash: exchange.prefundTxHash
    }));
    
    return res.json({
      success: true,
      exchanges: transformedExchanges,
      count: transformedExchanges.length,
      totalCount: totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
      hasPrevPage: pageNum > 1
    });
  } catch (err: any) {
    console.error('Error fetching public exchanges:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to fetch exchanges', 
      error: err?.message || String(err) 
    });
  }
};

// POST /api/exchanges/:exchangeId/complete
// Mark an exchange as completed with transaction hash
export const completeExchange: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { exchangeId } = req.params;
    const { prefundTxHash, connectedWallet, status = 'completed' } = req.body;
    
    if (!prefundTxHash) {
      return res.status(400).json({
        success: false,
        message: 'Transaction hash is required'
      });
    }
    
    // Find and update the exchange
    const exchange = await ExchangeHistory.findOne({ exchangeId });
    
    if (!exchange) {
      return res.status(404).json({
        success: false,
        message: 'Exchange not found'
      });
    }
    
    // Check if already completed
    if (exchange.status === 'completed' || exchange.prefundTxHash) {
      return res.status(400).json({
        success: false,
        message: 'Exchange is already completed'
      });
    }
    
    // Update the exchange
    exchange.prefundTxHash = prefundTxHash;
    exchange.status = status;
    if (connectedWallet) {
      exchange.connectedWallet = connectedWallet;
    }
    exchange.updatedAt = new Date();
    
    await exchange.save();
    
    return res.json({
      success: true,
      message: 'Exchange completed successfully',
      exchange: {
        exchangeId: exchange.exchangeId,
        status: exchange.status,
        prefundTxHash: exchange.prefundTxHash,
        updatedAt: exchange.updatedAt
      }
    });
  } catch (err: any) {
    console.error('Error completing exchange:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete exchange',
      error: err?.message || String(err)
    });
  }
};
