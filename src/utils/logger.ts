// Simplified logger for automated swap system
class Logger {
  error(message: string, ...args: any[]): void {
    console.error(`❌ ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`⚠️ ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.log(`ℹ️ ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`🔍 ${message}`, ...args);
  }

  // Specialized logging methods for automated swap system
  swapStarted(exchangeId: string, fromToken: string, toToken: string, amount: string): void {
    this.info(`🔄 SWAP STARTED: ${exchangeId} | ${amount} ${fromToken} → ${toToken}`);
  }

  swapCompleted(exchangeId: string, txHash: string, duration: number): void {
    this.info(`✅ SWAP COMPLETED: ${exchangeId} | TX: ${txHash} | Duration: ${duration}ms`);
  }

  swapFailed(exchangeId: string, error: string): void {
    this.error(`❌ SWAP FAILED: ${exchangeId} | Error: ${error}`);
  }

  depositDetected(exchangeId: string, amount: string, token: string, txHash: string): void {
    this.info(`💰 DEPOSIT DETECTED: ${exchangeId} | ${amount} ${token} | TX: ${txHash}`);
  }
}

// Export singleton instance
export const logger = new Logger();
