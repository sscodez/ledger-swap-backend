import ExchangeHistory from '../models/ExchangeHistory';
import User from '../models/User';

interface NotificationData {
  txHash?: string;
  amount?: string;
  fromToken?: string;
  toToken?: string;
  error?: string;
  estimatedTime?: string;
}

export class NotificationService {
  constructor() {
    console.log('📧 Notification service initialized');
  }

  /**
   * Send swap notification to user
   */
  async sendSwapNotification(
    exchangeId: string,
    status: 'processing' | 'completed' | 'failed',
    data: NotificationData
  ): Promise<void> {
    try {
      const exchange = await ExchangeHistory.findOne({ exchangeId })
        .populate('user', 'email name');

      if (!exchange) {
        console.warn(`⚠️ Exchange not found for notification: ${exchangeId}`);
        return;
      }

      // Log notification (simplified - no actual email sending)
      console.log(`📨 Notification for exchange ${exchangeId}: ${status}`, data);

    } catch (error) {
      console.error(`❌ Error sending notification for ${exchangeId}:`, error);
    }
  }

  /**
   * Send deposit confirmation notification
   */
  async sendDepositConfirmation(
    exchangeId: string,
    amount: string,
    currency: string,
    txHash: string
  ): Promise<void> {
    await this.sendSwapNotification(exchangeId, 'processing', {
      amount,
      fromToken: currency,
      txHash
    });
  }

  /**
   * Send swap completion notification
   */
  async sendSwapCompletion(
    exchangeId: string,
    txHash: string,
    fromToken: string,
    toToken: string,
    amount: string
  ): Promise<void> {
    await this.sendSwapNotification(exchangeId, 'completed', {
      txHash,
      fromToken,
      toToken,
      amount
    });
  }

  /**
   * Send swap failure notification
   */
  async sendSwapFailure(
    exchangeId: string,
    error: string
  ): Promise<void> {
    await this.sendSwapNotification(exchangeId, 'failed', {
      error
    });
  }
}

// Export singleton instance and helper function
export const notificationService = new NotificationService();

export async function sendSwapNotification(
  exchangeId: string,
  status: 'processing' | 'completed' | 'failed',
  data: NotificationData
): Promise<void> {
  return notificationService.sendSwapNotification(exchangeId, status, data);
}

