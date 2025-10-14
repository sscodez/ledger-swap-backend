"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
// Simplified logger for automated swap system
class Logger {
    error(message, ...args) {
        console.error(`❌ ${message}`, ...args);
    }
    warn(message, ...args) {
        console.warn(`⚠️ ${message}`, ...args);
    }
    info(message, ...args) {
        console.log(`ℹ️ ${message}`, ...args);
    }
    debug(message, ...args) {
        console.debug(`🔍 ${message}`, ...args);
    }
    // Specialized logging methods for automated swap system
    swapStarted(exchangeId, fromToken, toToken, amount) {
        this.info(`🔄 SWAP STARTED: ${exchangeId} | ${amount} ${fromToken} → ${toToken}`);
    }
    swapCompleted(exchangeId, txHash, duration) {
        this.info(`✅ SWAP COMPLETED: ${exchangeId} | TX: ${txHash} | Duration: ${duration}ms`);
    }
    swapFailed(exchangeId, error) {
        this.error(`❌ SWAP FAILED: ${exchangeId} | Error: ${error}`);
    }
    depositDetected(exchangeId, amount, token, txHash) {
        this.info(`💰 DEPOSIT DETECTED: ${exchangeId} | ${amount} ${token} | TX: ${txHash}`);
    }
}
// Export singleton instance
exports.logger = new Logger();
