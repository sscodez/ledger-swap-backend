import ExchangeHistory from '../models/ExchangeHistory';
import { 
  checkNewDeposits, 
  processSwapOrder, 
  SUPPORTED_CHAINS 
} from '../utils/kucoin';

interface UserOrder {
  exchangeId: string;
  fromCurrency: string;
  toCurrency: string;
  expectedAmount: number;
  walletAddress?: string;
  depositAddress: string;
  expiresAt: Date;
}

class KuCoinMonitoringService {
  private isRunning = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITORING_INTERVAL = 10000; // 10 seconds
  private readonly EXPIRATION_CHECK_INTERVAL = 30000; // 30 seconds
  private expirationInterval: NodeJS.Timeout | null = null;

  /**
   * Start the monitoring service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ KuCoin monitoring service is already running');
      return;
    }

    console.log('🚀 Starting KuCoin monitoring service...');
    this.isRunning = true;

    // Start deposit monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkDepositsAndProcessSwaps();
      } catch (error: any) {
        console.error('❌ Error in monitoring cycle:', error.message);
      }
    }, this.MONITORING_INTERVAL);

    // Start expiration checking
    this.expirationInterval = setInterval(async () => {
      try {
        await this.checkExpiredExchanges();
      } catch (error: any) {
        console.error('❌ Error checking expired exchanges:', error.message);
      }
    }, this.EXPIRATION_CHECK_INTERVAL);

    console.log('✅ KuCoin monitoring service started successfully');
    console.log(`🔍 Checking deposits every ${this.MONITORING_INTERVAL / 1000} seconds`);
    console.log(`⏰ Checking expirations every ${this.EXPIRATION_CHECK_INTERVAL / 1000} seconds`);
  }

  /**
   * Stop the monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ KuCoin monitoring service is not running');
      return;
    }

    console.log('🛑 Stopping KuCoin monitoring service...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.expirationInterval) {
      clearInterval(this.expirationInterval);
      this.expirationInterval = null;
    }

    this.isRunning = false;
    console.log('✅ KuCoin monitoring service stopped');
  }

  /**
   * Get active user orders from database
   */
  private async getActiveUserOrders(): Promise<UserOrder[]> {
    try {
      const activeExchanges = await ExchangeHistory.find({
        monitoringActive: true,
        depositReceived: false,
        kucoinDepositAddress: { $exists: true, $ne: null },
        expiresAt: { $gt: new Date() }
      }).lean();

      return activeExchanges.map(exchange => ({
        exchangeId: exchange.exchangeId,
        fromCurrency: exchange.from.currency,
        toCurrency: exchange.to.currency,
        expectedAmount: exchange.from.amount,
        walletAddress: exchange.walletAddress,
        depositAddress: exchange.kucoinDepositAddress!,
        expiresAt: exchange.expiresAt!
      }));
    } catch (error: any) {
      console.error('❌ Error fetching active orders:', error.message);
      return [];
    }
  }

  /**
   * Main monitoring function to check deposits and process swaps
   */
  private async checkDepositsAndProcessSwaps(): Promise<void> {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🔍 [${timestamp}] Checking for new deposits...`);

    // Get active user orders
    const userOrders = await this.getActiveUserOrders();
    
    if (userOrders.length === 0) {
      console.log('   No active exchanges to monitor.');
      return;
    }

    console.log(`📋 Monitoring ${userOrders.length} active exchange(s)`);

    // Check for new deposits
    const newDeposits = await checkNewDeposits();

    if (newDeposits.length === 0) {
      console.log('   No new deposits found.');
      return;
    }

    console.log(`🎉 Found ${newDeposits.length} new deposit(s)!`);

    // Process each deposit
    for (const deposit of newDeposits) {
      console.log(`\n💰 Processing deposit:`);
      console.log(`   Amount: ${deposit.amount} ${deposit.currency}`);
      console.log(`   Address: ${deposit.address}`);
      console.log(`   From: ${deposit.from || 'Unknown'}`);
      console.log(`   Time: ${deposit.time.toLocaleString()}`);

      // Find matching user order
      const matchingOrder = userOrders.find(order => 
        order.fromCurrency.toUpperCase() === deposit.currency.toUpperCase() &&
        order.depositAddress === deposit.address &&
        Math.abs(order.expectedAmount - deposit.amount) < 0.0001 // Allow small differences due to fees
      );

      if (!matchingOrder) {
        console.log('⚠️ No matching exchange found for this deposit');
        continue;
      }

      console.log(`✅ Matched with exchange: ${matchingOrder.exchangeId}`);

      try {
        // Update exchange status to processing
        await this.updateExchangeStatus(matchingOrder.exchangeId, 'processing', {
          depositTxId: deposit.id,
          depositAmount: deposit.amount
        });

        // Process the swap
        const swapResult = await processSwapOrder(
          deposit,
          matchingOrder.toCurrency,
          matchingOrder.exchangeId,
          matchingOrder.walletAddress
        );

        if (swapResult.success) {
          // Update exchange to completed
          await this.updateExchangeStatus(matchingOrder.exchangeId, 'completed', {
            kucoinOrderId: swapResult.orderId,
            withdrawalTxId: swapResult.withdrawal?.withdrawalId
          });

          console.log(`✅ Exchange ${matchingOrder.exchangeId} completed successfully!`);
          
          // TODO: Send notification to user (webhook, email, etc.)
          await this.notifyUser(matchingOrder.exchangeId, 'completed', swapResult);
        } else {
          // Update exchange to failed
          await this.updateExchangeStatus(matchingOrder.exchangeId, 'failed');
          console.log(`❌ Exchange ${matchingOrder.exchangeId} failed: ${swapResult.error}`);
          
          // TODO: Send failure notification to user
          await this.notifyUser(matchingOrder.exchangeId, 'failed', { error: swapResult.error });
        }
      } catch (error: any) {
        console.error(`❌ Error processing exchange ${matchingOrder.exchangeId}:`, error.message);
        await this.updateExchangeStatus(matchingOrder.exchangeId, 'failed');
        await this.notifyUser(matchingOrder.exchangeId, 'failed', { error: error.message });
      }
    }
  }

  /**
   * Check for expired exchanges and mark them as expired
   */
  private async checkExpiredExchanges(): Promise<void> {
    try {
      const now = new Date();
      const expiredExchanges = await ExchangeHistory.find({
        monitoringActive: true,
        depositReceived: false,
        expiresAt: { $lte: now }
      });

      if (expiredExchanges.length === 0) {
        return;
      }

      console.log(`⏰ Found ${expiredExchanges.length} expired exchange(s)`);

      for (const exchange of expiredExchanges) {
        console.log(`⏰ Expiring exchange: ${exchange.exchangeId}`);
        
        await this.updateExchangeStatus(exchange.exchangeId, 'expired');
        
        // TODO: Send expiration notification to user
        await this.notifyUser(exchange.exchangeId, 'expired', {
          message: 'Exchange expired - no deposit received within 5 minutes'
        });
      }
    } catch (error: any) {
      console.error('❌ Error checking expired exchanges:', error.message);
    }
  }

  /**
   * Update exchange status in database
   */
  private async updateExchangeStatus(
    exchangeId: string, 
    status: string, 
    additionalData: any = {}
  ): Promise<void> {
    try {
      const updateData: any = { 
        status,
        ...additionalData
      };

      // Update monitoring and completion flags based on status
      if (status === 'processing') {
        updateData.depositReceived = true;
      } else if (status === 'completed') {
        updateData.swapCompleted = true;
        updateData.monitoringActive = false;
      } else if (status === 'failed' || status === 'expired') {
        updateData.monitoringActive = false;
      }

      await ExchangeHistory.findOneAndUpdate(
        { exchangeId },
        updateData,
        { new: true }
      );

      console.log(`📝 Updated exchange ${exchangeId} status to: ${status}`);
    } catch (error: any) {
      console.error(`❌ Error updating exchange ${exchangeId}:`, error.message);
    }
  }

  /**
   * Send notification to user (placeholder for webhook/email integration)
   */
  private async notifyUser(
    exchangeId: string, 
    status: string, 
    data: any
  ): Promise<void> {
    // TODO: Implement actual notification system
    // This could include:
    // - Webhook calls to frontend
    // - Email notifications
    // - SMS notifications
    // - Push notifications
    
    console.log(`📧 [NOTIFICATION] Exchange ${exchangeId} - Status: ${status}`);
    console.log(`📧 [NOTIFICATION] Data:`, JSON.stringify(data, null, 2));
    
    // For now, just log the notification
    // In production, you would implement actual notification delivery
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; activeOrders?: number } {
    return {
      isRunning: this.isRunning
    };
  }

  /**
   * Get monitoring statistics
   */
  async getStats(): Promise<any> {
    try {
      const [activeExchanges, processingExchanges, completedToday, failedToday] = await Promise.all([
        ExchangeHistory.countDocuments({ monitoringActive: true, depositReceived: false }),
        ExchangeHistory.countDocuments({ status: 'processing' }),
        ExchangeHistory.countDocuments({ 
          status: 'completed', 
          date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }),
        ExchangeHistory.countDocuments({ 
          status: 'failed', 
          date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        })
      ]);

      return {
        isRunning: this.isRunning,
        activeExchanges,
        processingExchanges,
        completedToday,
        failedToday,
        uptime: this.isRunning ? 'Running' : 'Stopped'
      };
    } catch (error: any) {
      console.error('❌ Error getting stats:', error.message);
      return {
        isRunning: this.isRunning,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const kucoinMonitoringService = new KuCoinMonitoringService();

export default kucoinMonitoringService;
