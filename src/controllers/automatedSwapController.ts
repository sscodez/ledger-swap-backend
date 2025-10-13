import { Request, Response } from 'express';
import { automatedSwapService } from '../services/automatedSwapService';
import { depositDetectionService } from '../services/depositDetectionService';
import ExchangeHistory from '../models/ExchangeHistory';
import { logger } from '../utils/logger';

/**
 * Start automated swap monitoring system
 */
export const startAutomatedSwaps = async (req: Request, res: Response) => {
  try {
    logger.info('🚀 Starting automated swap system...');

    // Start deposit detection service
    await depositDetectionService.startMonitoring();

    // Get system status
    const swapStatus = automatedSwapService.getSwapQueueStatus();
    const monitoringStatus = depositDetectionService.getMonitoringStatus();

    res.json({
      message: 'Automated swap system started successfully',
      status: 'running',
      swapService: swapStatus,
      depositMonitoring: monitoringStatus,
      timestamp: new Date().toISOString()
    });

    logger.info('✅ Automated swap system started successfully');
  } catch (error) {
    logger.error('❌ Failed to start automated swap system:', error);
    res.status(500).json({
      message: 'Failed to start automated swap system',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Stop automated swap monitoring system
 */
export const stopAutomatedSwaps = async (req: Request, res: Response) => {
  try {
    logger.info('🛑 Stopping automated swap system...');

    // Stop deposit detection service
    await depositDetectionService.stopMonitoring();

    res.json({
      message: 'Automated swap system stopped successfully',
      status: 'stopped',
      timestamp: new Date().toISOString()
    });

    logger.info('✅ Automated swap system stopped successfully');
  } catch (error) {
    logger.error('❌ Failed to stop automated swap system:', error);
    res.status(500).json({
      message: 'Failed to stop automated swap system',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get automated swap system status
 */
export const getAutomatedSwapStatus = async (req: Request, res: Response) => {
  try {
    const swapStatus = automatedSwapService.getSwapQueueStatus();
    const monitoringStatus = depositDetectionService.getMonitoringStatus();

    // Get recent swap statistics
    const stats = await getSwapStatistics();

    res.json({
      status: monitoringStatus.isRunning ? 'running' : 'stopped',
      swapService: swapStatus,
      depositMonitoring: monitoringStatus,
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Error getting automated swap status:', error);
    res.status(500).json({
      message: 'Failed to get system status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Trigger manual swap execution (for testing/admin)
 */
export const triggerManualSwap = async (req: Request, res: Response) => {
  try {
    const { exchangeId } = req.params;
    
    if (!exchangeId) {
      return res.status(400).json({
        message: 'Exchange ID is required'
      });
    }

    logger.info(`🔧 Manual swap trigger requested for exchange: ${exchangeId}`);

    // Execute manual swap
    await automatedSwapService.executeManualSwap(exchangeId);

    res.json({
      message: 'Manual swap executed successfully',
      exchangeId,
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ Manual swap completed for ${exchangeId}`);
  } catch (error) {
    logger.error('❌ Failed to execute manual swap:', error);
    res.status(500).json({
      message: 'Failed to execute manual swap',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Test automated swap system with mock deposit
 */
export const testAutomatedSwap = async (req: Request, res: Response) => {
  try {
    const { exchangeId } = req.params;
    const { amount, currency, txHash } = req.body;
    
    if (!exchangeId) {
      return res.status(400).json({
        message: 'Exchange ID is required'
      });
    }

    logger.info(`🧪 Testing automated swap for exchange: ${exchangeId}`);

    // Get exchange details
    const exchange = await ExchangeHistory.findOne({ exchangeId });
    if (!exchange) {
      return res.status(404).json({
        message: 'Exchange not found'
      });
    }

    // Create mock deposit event
    const mockDepositEvent = {
      exchangeId: exchange.exchangeId,
      txHash: txHash || `test_tx_${Date.now()}`,
      fromAddress: 'test_wallet_address',
      toAddress: exchange.kucoinDepositAddress || 'test_deposit_address',
      amount: (amount || exchange.from.amount).toString(),
      token: (currency || exchange.from.currency).toUpperCase(),
      chain: 'ethereum',
      blockNumber: Date.now(),
      confirmations: 12
    };

    // Process the mock deposit
    await automatedSwapService.processDeposit(mockDepositEvent);

    res.json({
      message: 'Test automated swap triggered successfully',
      exchangeId,
      mockDeposit: mockDepositEvent,
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ Test automated swap completed for ${exchangeId}`);
  } catch (error) {
    logger.error('❌ Failed to test automated swap:', error);
    res.status(500).json({
      message: 'Failed to test automated swap',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Add address to monitoring (for new exchanges)
 */
export const addMonitoredAddress = async (req: Request, res: Response) => {
  try {
    const { address, exchangeId, currency, expectedAmount, expiresAt } = req.body;

    if (!address || !exchangeId || !currency || !expectedAmount) {
      return res.status(400).json({
        message: 'Missing required fields: address, exchangeId, currency, expectedAmount'
      });
    }

    const expirationDate = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 60 * 1000);

    await depositDetectionService.addMonitoredAddress(
      address,
      exchangeId,
      currency,
      expectedAmount,
      expirationDate
    );

    res.json({
      message: 'Address added to monitoring successfully',
      address,
      exchangeId,
      expiresAt: expirationDate.toISOString()
    });

    logger.info(`👁️ Added address ${address} to monitoring for exchange ${exchangeId}`);
  } catch (error) {
    logger.error('❌ Error adding monitored address:', error);
    res.status(500).json({
      message: 'Failed to add monitored address',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get swap queue information
 */
export const getSwapQueue = async (req: Request, res: Response) => {
  try {
    const queueStatus = automatedSwapService.getSwapQueueStatus();
    
    // Get pending exchanges from database
    const pendingExchanges = await ExchangeHistory.find({
      status: { $in: ['pending', 'processing'] },
      monitoringActive: true
    }).select('exchangeId from to status createdAt expiresAt');

    res.json({
      queue: queueStatus,
      pendingExchanges: pendingExchanges.map(exchange => ({
        exchangeId: exchange.exchangeId,
        from: exchange.from,
        to: exchange.to,
        status: exchange.status,
        createdAt: exchange.createdAt,
        expiresAt: exchange.expiresAt
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Error getting swap queue:', error);
    res.status(500).json({
      message: 'Failed to get swap queue',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get swap statistics
 */
async function getSwapStatistics() {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      totalSwaps,
      completedSwaps,
      failedSwaps,
      swapsLast24h,
      swapsLastHour,
      processingSwaps
    ] = await Promise.all([
      ExchangeHistory.countDocuments({}),
      ExchangeHistory.countDocuments({ status: 'completed' }),
      ExchangeHistory.countDocuments({ status: 'failed' }),
      ExchangeHistory.countDocuments({ createdAt: { $gte: last24Hours } }),
      ExchangeHistory.countDocuments({ createdAt: { $gte: lastHour } }),
      ExchangeHistory.countDocuments({ status: 'processing' })
    ]);

    // Calculate success rate
    const successRate = totalSwaps > 0 ? (completedSwaps / totalSwaps * 100).toFixed(2) : '0';

    return {
      total: totalSwaps,
      completed: completedSwaps,
      failed: failedSwaps,
      processing: processingSwaps,
      successRate: `${successRate}%`,
      last24Hours: swapsLast24h,
      lastHour: swapsLastHour
    };
  } catch (error) {
    logger.error('❌ Error calculating swap statistics:', error);
    return {
      total: 0,
      completed: 0,
      failed: 0,
      processing: 0,
      successRate: '0%',
      last24Hours: 0,
      lastHour: 0
    };
  }
}

/**
 * Get system health check
 */
export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const swapStatus = automatedSwapService.getSwapQueueStatus();
    const monitoringStatus = depositDetectionService.getMonitoringStatus();
    const stats = await getSwapStatistics();

    // Check if system is healthy
    const isHealthy = swapStatus.isInitialized && monitoringStatus.isRunning;
    const healthStatus = isHealthy ? 'healthy' : 'unhealthy';

    res.json({
      status: healthStatus,
      services: {
        rubicSDK: {
          status: swapStatus.isInitialized ? 'active' : 'inactive',
          description: 'Rubic SDK for automated swaps'
        },
        depositMonitoring: {
          status: monitoringStatus.isRunning ? 'active' : 'inactive',
          description: 'Blockchain deposit detection'
        },
        swapQueue: {
          status: 'active',
          queueSize: swapStatus.queueSize,
          processing: swapStatus.processing
        }
      },
      statistics: stats,
      monitoredChains: monitoringStatus.activeChains,
      monitoredAddresses: monitoringStatus.monitoredAddresses,
      timestamp: new Date().toISOString()
    });

    // Set appropriate HTTP status
    res.status(isHealthy ? 200 : 503);
  } catch (error) {
    logger.error('❌ Error getting system health:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};
