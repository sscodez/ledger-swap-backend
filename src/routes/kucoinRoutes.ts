import express from 'express';
import kucoinMonitoringService from '../services/kucoinMonitoringService';
import { protect } from '../middleware/authMiddleware';
import ExchangeHistory from '../models/ExchangeHistory';
import { initializeDepositAddresses, SUPPORTED_CHAINS, getOrCreateDepositAddress } from '../utils/kucoin';

const router = express.Router();

/**
 * GET /api/kucoin/status
 * Get monitoring service status (admin only)
 */
router.get('/status', async (req, res) => {
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
router.post('/start', async (req, res) => {
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
router.post('/stop', async (req, res) => {
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
router.get('/addresses', async (req, res) => {
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
router.get('/exchanges/active', async (req, res) => {
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
router.get('/exchanges/expired', async (req, res) => {
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
router.post('/exchanges/:exchangeId/retry', async (req, res) => {
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

/**
 * GET /api/kucoin/test-connection
 * Test KuCoin API connection (admin only)
 */
router.get('/test-connection', async (req, res) => {
  try {
    console.log('🧪 Testing KuCoin API connection...');
    
    // Check environment variables
    const hasCredentials = !!(process.env.KUCOIN_API_KEY && process.env.KUCOIN_API_SECRET && process.env.KUCOIN_API_PASSPHRASE);
    
    console.log('🔑 API Credentials check:', {
      hasApiKey: !!process.env.KUCOIN_API_KEY,
      hasApiSecret: !!process.env.KUCOIN_API_SECRET,
      hasPassphrase: !!process.env.KUCOIN_API_PASSPHRASE,
      apiKeyLength: process.env.KUCOIN_API_KEY?.length || 0
    });
    
    if (!hasCredentials) {
      return res.status(400).json({
        message: 'KuCoin API credentials not configured',
        missing: {
          apiKey: !process.env.KUCOIN_API_KEY,
          apiSecret: !process.env.KUCOIN_API_SECRET,
          passphrase: !process.env.KUCOIN_API_PASSPHRASE
        }
      });
    }
    
    // Test basic API call - get account info
    const { kucoinRequest } = require('../utils/kucoin');
    const accountInfo = await kucoinRequest('GET', '/api/v1/accounts');
    
    res.json({
      message: 'KuCoin API connection successful',
      hasCredentials,
      accountsCount: accountInfo?.data?.length || 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ KuCoin connection test failed:', error);
    res.status(500).json({
      message: 'KuCoin API connection failed',
      error: error.message,
      details: error.response?.data || null
    });
  }
});

/**
 * POST /api/kucoin/test-deposit-address
 * Test deposit address generation (admin only)
 */
router.post('/test-deposit-address', async (req, res) => {
  try {
    const { currency, chain } = req.body;
    
    if (!currency || !chain) {
      return res.status(400).json({ 
        message: 'Currency and chain are required',
        example: { currency: 'BTC', chain: 'btc' }
      });
    }
    
    console.log(`🧪 Testing deposit address generation for ${currency} on ${chain}`);
    
    const result = await getOrCreateDepositAddress(currency, chain);
    
    if (result) {
      res.json({
        message: 'Deposit address generated successfully',
        address: result.address,
        currency: result.currency,
        chain: result.chain,
        result
      });
    } else {
      res.status(500).json({
        message: 'Failed to generate deposit address',
        currency,
        chain
      });
    }
  } catch (error: any) {
    console.error('❌ Test deposit address error:', error);
    res.status(500).json({ 
      message: 'Error testing deposit address generation', 
      error: error.message 
    });
  }
});

export default router;
