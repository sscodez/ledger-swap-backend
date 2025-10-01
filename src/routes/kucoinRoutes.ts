import express from 'express';
import kucoinMonitoringService from '../services/kucoinMonitoringService';
import { protect } from '../middleware/authMiddleware';
import ExchangeHistory from '../models/ExchangeHistory';
import { initializeDepositAddresses, SUPPORTED_CHAINS } from '../utils/kucoin';

const router = express.Router();

/**
 * GET /api/kucoin/status
 * Get monitoring service status (admin only)
 */
router.get('/status', protect, async (req, res) => {
  try {
    const stats = await kucoinMonitoringService.getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to get service status', 
      error: error.message 
    });
  }
});

/**
 * POST /api/kucoin/start
 * Start monitoring service (admin only)
 */
router.post('/start', protect, async (req, res) => {
  try {
    await kucoinMonitoringService.start();
    res.json({ 
      message: 'KuCoin monitoring service started successfully',
      status: 'running'
    });
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to start monitoring service', 
      error: error.message 
    });
  }
});

/**
 * POST /api/kucoin/stop
 * Stop monitoring service (admin only)
 */
router.post('/stop', protect, async (req, res) => {
  try {
    kucoinMonitoringService.stop();
    res.json({ 
      message: 'KuCoin monitoring service stopped successfully',
      status: 'stopped'
    });
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to stop monitoring service', 
      error: error.message 
    });
  }
});

/**
 * GET /api/kucoin/addresses
 * Get all deposit addresses (admin only)
 */
router.get('/addresses', protect, async (req, res) => {
  try {
    const addresses = await initializeDepositAddresses();
    res.json({
      message: 'Deposit addresses retrieved successfully',
      addresses,
      supportedChains: SUPPORTED_CHAINS
    });
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to get deposit addresses', 
      error: error.message 
    });
  }
});

/**
 * GET /api/kucoin/exchanges/active
 * Get active exchanges being monitored (admin only)
 */
router.get('/exchanges/active', protect, async (req, res) => {
  try {
    const activeExchanges = await ExchangeHistory.find({
      monitoringActive: true,
      depositReceived: false,
      kucoinDepositAddress: { $exists: true, $ne: null }
    }).sort({ date: -1 });

    res.json({
      message: 'Active exchanges retrieved successfully',
      count: activeExchanges.length,
      exchanges: activeExchanges
    });
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to get active exchanges', 
      error: error.message 
    });
  }
});

/**
 * GET /api/kucoin/exchanges/expired
 * Get expired exchanges (admin only)
 */
router.get('/exchanges/expired', protect, async (req, res) => {
  try {
    const expiredExchanges = await ExchangeHistory.find({
      status: 'expired'
    }).sort({ date: -1 }).limit(50);

    res.json({
      message: 'Expired exchanges retrieved successfully',
      count: expiredExchanges.length,
      exchanges: expiredExchanges
    });
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to get expired exchanges', 
      error: error.message 
    });
  }
});

/**
 * POST /api/kucoin/exchanges/:exchangeId/retry
 * Retry a failed exchange (admin only)
 */
router.post('/exchanges/:exchangeId/retry', protect, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    
    const exchange = await ExchangeHistory.findOne({ exchangeId });
    if (!exchange) {
      return res.status(404).json({ message: 'Exchange not found' });
    }

    if (exchange.status !== 'failed' && exchange.status !== 'expired') {
      return res.status(400).json({ 
        message: 'Can only retry failed or expired exchanges',
        currentStatus: exchange.status
      });
    }

    // Reset exchange for retry
    const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    await ExchangeHistory.findOneAndUpdate(
      { exchangeId },
      {
        status: 'pending',
        monitoringActive: true,
        depositReceived: false,
        swapCompleted: false,
        expiresAt: newExpiresAt,
        kucoinOrderId: undefined,
        depositTxId: undefined,
        withdrawalTxId: undefined,
        depositAmount: undefined
      }
    );

    res.json({
      message: 'Exchange retry initiated successfully',
      exchangeId,
      newExpiresAt: newExpiresAt.toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to retry exchange', 
      error: error.message 
    });
  }
});

/**
 * GET /api/kucoin/supported-currencies
 * Get supported currencies for KuCoin integration (public)
 */
router.get('/supported-currencies', (req, res) => {
  res.json({
    message: 'Supported currencies retrieved successfully',
    currencies: Object.keys(SUPPORTED_CHAINS),
    chains: SUPPORTED_CHAINS
  });
});

export default router;
