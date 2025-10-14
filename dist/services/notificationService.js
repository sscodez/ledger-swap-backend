"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
exports.sendSwapNotification = sendSwapNotification;
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
class NotificationService {
    constructor() {
        console.log('📧 Notification service initialized');
    }
    /**
     * Send swap notification to user
     */
    sendSwapNotification(exchangeId, status, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const exchange = yield ExchangeHistory_1.default.findOne({ exchangeId })
                    .populate('user', 'email name');
                if (!exchange) {
                    console.warn(`⚠️ Exchange not found for notification: ${exchangeId}`);
                    return;
                }
                // Log notification (simplified - no actual email sending)
                console.log(`📨 Notification for exchange ${exchangeId}: ${status}`, data);
            }
            catch (error) {
                console.error(`❌ Error sending notification for ${exchangeId}:`, error);
            }
        });
    }
    /**
     * Send deposit confirmation notification
     */
    sendDepositConfirmation(exchangeId, amount, currency, txHash) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendSwapNotification(exchangeId, 'processing', {
                amount,
                fromToken: currency,
                txHash
            });
        });
    }
    /**
     * Send swap completion notification
     */
    sendSwapCompletion(exchangeId, txHash, fromToken, toToken, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendSwapNotification(exchangeId, 'completed', {
                txHash,
                fromToken,
                toToken,
                amount
            });
        });
    }
    /**
     * Send swap failure notification
     */
    sendSwapFailure(exchangeId, error) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendSwapNotification(exchangeId, 'failed', {
                error
            });
        });
    }
}
exports.NotificationService = NotificationService;
// Export singleton instance and helper function
exports.notificationService = new NotificationService();
function sendSwapNotification(exchangeId, status, data) {
    return __awaiter(this, void 0, void 0, function* () {
        return exports.notificationService.sendSwapNotification(exchangeId, status, data);
    });
}
