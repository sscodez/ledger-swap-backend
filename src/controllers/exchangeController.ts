import { Request, Response, RequestHandler } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import ExchangeHistory from '../models/ExchangeHistory';
import { checkComprehensiveFlagged } from '../utils/flaggedCheck';
import { getOrCreateDepositAddress, SUPPORTED_CHAINS } from '../utils/kucoin';

function generateExchangeId() {
  return `EX-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

// POST /api/exchanges
// Creates a new exchange entry and returns server-generated exchangeId (and the created record)
// Now supports both authenticated and anonymous users
export const createExchange: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { fromCurrency, toCurrency, sendAmount, receiveAmount, fees = 0, cashback = 0, walletAddress, status } = req.body || {};

  if (!fromCurrency || !toCurrency) {
    return res.status(400).json({ message: 'fromCurrency and toCurrency are required' });
  }

  // Check if user or recipient address is flagged (only if user is authenticated)
  if (authReq.user) {
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
  }

  const exchangeId = generateExchangeId();
  const allowedStatuses = new Set(['pending', 'completed', 'failed', 'in_review', 'expired', 'processing']);
  const computedStatus = allowedStatuses.has(String(status)) ? (String(status) as any) : 'pending';

  try {
    // Generate KuCoin deposit address for the fromCurrency
    let kucoinDepositAddress = null;
    let kucoinDepositCurrency = null;
    
    const fromCurrencyUpper = String(fromCurrency).toUpperCase();
    console.log(`🔍 Checking currency support for: ${fromCurrencyUpper}`);
    console.log(`📋 Supported chains:`, Object.keys(SUPPORTED_CHAINS));
    
    if (SUPPORTED_CHAINS[fromCurrencyUpper as keyof typeof SUPPORTED_CHAINS]) {
      const chainConfig = SUPPORTED_CHAINS[fromCurrencyUpper as keyof typeof SUPPORTED_CHAINS];
      console.log(`🏦 Generating deposit address for ${fromCurrencyUpper}...`);
      console.log(`⚙️ Chain config:`, chainConfig);
      
      // Check if KuCoin API credentials are available
      if (!process.env.KUCOIN_API_KEY || !process.env.KUCOIN_API_SECRET || !process.env.KUCOIN_API_PASSPHRASE) {
        console.error('❌ KuCoin API credentials not configured');
        console.log('⚠️ Continuing without deposit address generation');
      } else {
        try {
          const depositAddressResult = await getOrCreateDepositAddress(chainConfig.currency, chainConfig.chain);
          if (depositAddressResult && depositAddressResult.address) {
            kucoinDepositAddress = depositAddressResult.address;
            kucoinDepositCurrency = chainConfig.currency;
            console.log(`✅ Generated deposit address: ${kucoinDepositAddress}`);
          } else {
            console.log('⚠️ No address returned from KuCoin API');
          }
        } catch (depositError: any) {
          console.error('❌ Failed to generate deposit address:', depositError.message);
          console.error('❌ Full error:', depositError);
          // Continue without deposit address - can be generated later
        }
      }
    } else {
      console.log(`ℹ️ Currency ${fromCurrencyUpper} not supported by KuCoin integration`);
    }

    // Set expiration time (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const record = await ExchangeHistory.create({
      user: authReq.user ? authReq.user._id : null, // Allow null for anonymous exchanges
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
      isAnonymous: !authReq.user, // Track if this is an anonymous exchange
      
      // KuCoin Integration Fields
      kucoinDepositAddress,
      kucoinDepositCurrency,
      depositReceived: false,
      swapCompleted: false,
      expiresAt,
      monitoringActive: true,
    });

    console.log(`🎯 Exchange created: ${exchangeId}`);
    console.log(`📍 Deposit address: ${kucoinDepositAddress || 'Not generated'}`);
    console.log(`⏰ Expires at: ${expiresAt.toISOString()}`);

    return res.status(201).json({ 
      exchangeId, 
      record,
      depositAddress: kucoinDepositAddress,
      expiresAt: expiresAt.toISOString()
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
    const { status, kucoinOrderId, depositTxId, withdrawalTxId, depositAmount } = req.body;
    const allowed = new Set(['pending', 'completed', 'failed', 'in_review', 'expired', 'processing']);
    if (!status || !allowed.has(String(status))) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const updateData: any = { status: String(status) };
    
    // Add optional KuCoin fields if provided
    if (kucoinOrderId) updateData.kucoinOrderId = kucoinOrderId;
    if (depositTxId) updateData.depositTxId = depositTxId;
    if (withdrawalTxId) updateData.withdrawalTxId = withdrawalTxId;
    if (depositAmount !== undefined) updateData.depositAmount = Number(depositAmount);
    
    // Update monitoring and completion flags based on status
    if (status === 'processing') {
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
