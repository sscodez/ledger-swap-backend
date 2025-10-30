import ExchangeHistory from '../models/ExchangeHistory';
import { logger } from '../utils/logger';

interface SwapQueueItem {
  exchangeId: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  recipientAddress: string;
  priority: number;
  addedAt: Date;
}

/**
 * Automated Swap Service
 * Simple queue-based swap processing without external dependencies
 */
class AutomatedSwapService {
  private swapQueue: SwapQueueItem[] = [];
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    logger.info('🤖 Automated Swap Service initialized');
  }

  /**
   * Add exchange to swap queue
   */
  async addToQueue(exchangeId: string): Promise<void> {
    try {
      const exchange = await ExchangeHistory.findOne({ exchangeId });
      
      if (!exchange) {
        logger.error(`Exchange ${exchangeId} not found`);
        return;
      }

      const queueItem: SwapQueueItem = {
        exchangeId,
        fromCurrency: exchange.from.currency,
        toCurrency: exchange.to.currency,
        amount: exchange.from.amount,
        recipientAddress: exchange.walletAddress || '',
        priority: 1,
        addedAt: new Date()
      };

      this.swapQueue.push(queueItem);
      logger.info(`✅ Added exchange ${exchangeId} to swap queue`);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.startProcessing();
      }
    } catch (error: any) {
      logger.error(`Failed to add exchange to queue: ${error.message}`);
    }
  }

  /**
   * Start processing swap queue
   */
  private startProcessing(): void {
    if (this.processingInterval) return;

    this.isProcessing = true;
    logger.info('🚀 Starting swap queue processing');

    this.processingInterval = setInterval(async () => {
      await this.processNextSwap();
    }, 10000); // Process every 10 seconds

    // Process immediately
    this.processNextSwap();
  }

  /**
   * Process next swap in queue
   */
  private async processNextSwap(): Promise<void> {
    if (this.swapQueue.length === 0) {
      return;
    }

    const swap = this.swapQueue.shift();
    if (!swap) return;

    try {
      logger.info(`🔄 Processing swap for ${swap.exchangeId}`);
      logger.info(`   ${swap.amount} ${swap.fromCurrency} → ${swap.toCurrency}`);

      // Update status to processing
      await ExchangeHistory.findOneAndUpdate(
        { exchangeId: swap.exchangeId },
        {
          status: 'processing',
          notes: 'Swap in progress - manual processing required'
        }
      );

      // Mark for manual review (no automatic swap execution)
      await ExchangeHistory.findOneAndUpdate(
        { exchangeId: swap.exchangeId },
        {
          status: 'in_review',
          notes: 'Ready for manual swap execution by admin'
        }
      );

      logger.info(`✅ Exchange ${swap.exchangeId} marked for manual processing`);
    } catch (error: any) {
      logger.error(`❌ Failed to process ${swap.exchangeId}: ${error.message}`);

      await ExchangeHistory.findOneAndUpdate(
        { exchangeId: swap.exchangeId },
        {
          status: 'failed',
          errorMessage: error.message,
          notes: 'Processing failed - admin intervention required'
        }
      );
    }
  }

  /**
   * Stop processing
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      this.isProcessing = false;
      logger.info('🛑 Swap processing stopped');
    }
  }

  /**
   * Get queue status
   */
  getSwapQueueStatus() {
    return {
      queueSize: this.swapQueue.length,
      isProcessing: this.isProcessing,
      pendingSwaps: this.swapQueue.map(s => ({
        exchangeId: s.exchangeId,
        fromCurrency: s.fromCurrency,
        toCurrency: s.toCurrency,
        amount: s.amount
      }))
    };
  }

  /**
   * Manual swap trigger (for admin)
   */
  async triggerManualSwap(exchangeId: string): Promise<void> {
    logger.info(`🔧 Manual swap triggered for ${exchangeId}`);
    await this.addToQueue(exchangeId);
  }
}

export const automatedSwapService = new AutomatedSwapService();
export default automatedSwapService;
