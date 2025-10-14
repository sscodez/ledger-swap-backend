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
exports.updateExchangeStatus = exports.getExchangeById = exports.createExchange = void 0;
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
const flaggedCheck_1 = require("../utils/flaggedCheck");
const CryptoFee_1 = __importDefault(require("../models/CryptoFee"));
const depositDetectionService_1 = require("../services/depositDetectionService");
const automaticSwapService_1 = __importDefault(require("../services/automaticSwapService"));
const automatedSwapService_1 = require("../services/automatedSwapService");
function generateExchangeId() {
    return `EX-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}
// POST /api/exchanges
// Creates a new exchange entry and returns server-generated exchangeId (and the created record)
// Now supports both authenticated and anonymous users
const createExchange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    const { fromCurrency, toCurrency, sendAmount, receiveAmount, fees = 0, cashback = 0, walletAddress, status, isAnonymous, connectedWallet } = req.body || {};
    if (!fromCurrency || !toCurrency) {
        return res.status(400).json({ message: 'fromCurrency and toCurrency are required' });
    }
    // Determine if this should be an anonymous exchange
    const shouldBeAnonymous = isAnonymous || !authReq.user;
    // Check if user or addresses are flagged
    if (authReq.user && !shouldBeAnonymous) {
        // For authenticated users, check user and addresses
        try {
            const flaggedCheck = yield (0, flaggedCheck_1.checkComprehensiveFlagged)(authReq.user._id.toString(), walletAddress);
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
        }
        catch (flagCheckError) {
            console.error('Error checking flagged status:', flagCheckError);
            // Log the error but don't block the exchange if the check fails
            // This prevents system errors from blocking legitimate users
        }
    }
    else if (shouldBeAnonymous && (connectedWallet || walletAddress)) {
        // For anonymous users, check connected wallet and recipient address
        try {
            // Check connected wallet if provided
            if (connectedWallet) {
                const connectedWalletCheck = yield (0, flaggedCheck_1.checkComprehensiveFlagged)(null, connectedWallet);
                if (connectedWalletCheck.isFlagged) {
                    return res.status(403).json({
                        message: 'Exchange creation blocked: Connected wallet is flagged',
                        error: 'FLAGGED_CONNECTED_WALLET',
                        details: {
                            type: 'connected_wallet',
                            reason: connectedWalletCheck.reason,
                            flaggedAt: connectedWalletCheck.flaggedAt
                        }
                    });
                }
            }
            // Check recipient address
            if (walletAddress) {
                const recipientCheck = yield (0, flaggedCheck_1.checkComprehensiveFlagged)(null, walletAddress);
                if (recipientCheck.isFlagged) {
                    return res.status(403).json({
                        message: 'Exchange creation blocked: Recipient address is flagged',
                        error: 'FLAGGED_RECIPIENT_ADDRESS',
                        details: {
                            type: 'recipient_address',
                            reason: recipientCheck.reason,
                            flaggedAt: recipientCheck.flaggedAt
                        }
                    });
                }
            }
        }
        catch (flagCheckError) {
            console.error('Error checking flagged status for anonymous exchange:', flagCheckError);
            // Log the error but don't block the exchange if the check fails
        }
    }
    const exchangeId = generateExchangeId();
    const allowedStatuses = new Set(['pending', 'completed', 'failed', 'in_review', 'expired', 'processing']);
    const computedStatus = allowedStatuses.has(String(status)) ? String(status) : 'pending';
    try {
        // Master deposit address for all transactions
        const MASTER_DEPOSIT_ADDRESS = '0xda791a424b294a594D81b09A86531CB1Dcf6b932';
        let kucoinDepositAddress = MASTER_DEPOSIT_ADDRESS;
        let kucoinDepositCurrency = null;
        let depositMemo = null;
        let depositNetwork = null;
        const fromCurrencyUpper = String(fromCurrency).toUpperCase();
        console.log(`🔍 Setting up deposit address for: ${fromCurrencyUpper}`);
        // Always use master deposit address but get fee configuration
        try {
            // Find the crypto fee configuration for this currency
            const cryptoFeeConfig = yield CryptoFee_1.default.findOne({
                symbol: fromCurrencyUpper,
                isActive: true
            });
            if (cryptoFeeConfig) {
                kucoinDepositCurrency = cryptoFeeConfig.symbol;
                depositMemo = cryptoFeeConfig.depositMemo || null;
                depositNetwork = cryptoFeeConfig.depositNetwork || null;
                console.log(`✅ Using master deposit address: ${MASTER_DEPOSIT_ADDRESS}`);
                console.log(`💰 Fee configuration found: ${cryptoFeeConfig.feePercentage}%`);
                if (depositMemo)
                    console.log(`📝 Deposit memo: ${depositMemo}`);
                if (depositNetwork)
                    console.log(`🌐 Network: ${depositNetwork}`);
            }
            else {
                // Create default configuration if not exists
                kucoinDepositCurrency = fromCurrencyUpper;
                depositNetwork = ['ETH', 'USDT', 'USDC'].includes(fromCurrencyUpper)
                    ? (fromCurrencyUpper === 'ETH' ? 'Ethereum' : 'ERC20')
                    : fromCurrencyUpper;
                console.log(`⚠️ No fee configuration found for ${fromCurrencyUpper}, using defaults`);
                console.log(`🔄 Using master deposit address: ${MASTER_DEPOSIT_ADDRESS}`);
            }
        }
        catch (configError) {
            console.error('❌ Error fetching crypto fee configuration:', configError.message);
            // Still use master address even if config fails
            kucoinDepositCurrency = fromCurrencyUpper;
            depositNetwork = fromCurrencyUpper;
        }
        // Set expiration time (5 minutes from now)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        const record = yield ExchangeHistory_1.default.create({
            user: shouldBeAnonymous ? null : authReq.user._id,
            isAnonymous: shouldBeAnonymous,
            exchangeId,
            status: computedStatus,
            from: {
                currency: String(fromCurrency),
                amount: Number(sendAmount !== null && sendAmount !== void 0 ? sendAmount : 0),
            },
            to: {
                currency: String(toCurrency),
                amount: Number(receiveAmount !== null && receiveAmount !== void 0 ? receiveAmount : 0),
            },
            fees: Number(fees !== null && fees !== void 0 ? fees : 0),
            cashback: Number(cashback !== null && cashback !== void 0 ? cashback : 0),
            walletAddress: walletAddress ? String(walletAddress) : undefined,
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
        // 🤖 AUTOMATIC SWAP INTEGRATION
        // Add exchange to automatic swap monitoring system
        if (kucoinDepositAddress && fromCurrency && sendAmount) {
            try {
                // Add to automatic swap monitoring
                yield automaticSwapService_1.default.addExchangeToMonitoring(exchangeId);
                console.log(`🔍 Added ${exchangeId} to automatic swap monitoring system`);
                // Also add to legacy monitoring if available
                if (depositDetectionService_1.depositDetectionService && depositDetectionService_1.depositDetectionService.addMonitoredAddress) {
                    yield depositDetectionService_1.depositDetectionService.addMonitoredAddress(kucoinDepositAddress, exchangeId, String(fromCurrency).toUpperCase(), Number(sendAmount), expiresAt);
                }
            }
            catch (monitoringError) {
                console.error(`⚠️ Failed to add ${exchangeId} to monitoring:`, monitoringError.message);
                // Don't fail the exchange creation if monitoring fails
            }
        }
        return res.status(201).json({
            exchangeId,
            record,
            depositAddress: kucoinDepositAddress,
            depositMemo: depositMemo,
            depositNetwork: depositNetwork,
            expiresAt: expiresAt.toISOString(),
            automatedMonitoring: !!kucoinDepositAddress, // Indicate if automated monitoring is active
            addressSource: kucoinDepositAddress ? 'admin_configured' : 'not_available'
        });
    }
    catch (err) {
        return res.status(500).json({ message: 'Failed to create exchange', error: (err === null || err === void 0 ? void 0 : err.message) || String(err) });
    }
});
exports.createExchange = createExchange;
// GET /api/exchanges/:exchangeId
const getExchangeById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { exchangeId } = req.params;
        const record = yield ExchangeHistory_1.default.findOne({ exchangeId });
        if (!record)
            return res.status(404).json({ message: 'Exchange not found' });
        return res.json(record);
    }
    catch (err) {
        return res.status(500).json({ message: 'Failed to fetch exchange', error: (err === null || err === void 0 ? void 0 : err.message) || String(err) });
    }
});
exports.getExchangeById = getExchangeById;
// PUT /api/exchanges/:exchangeId/status
const updateExchangeStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { exchangeId } = req.params;
        const { status, kucoinOrderId, depositTxId, withdrawalTxId, depositAmount } = req.body;
        const allowed = new Set(['pending', 'completed', 'failed', 'in_review', 'expired', 'processing']);
        if (!status || !allowed.has(String(status))) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const updateData = { status: String(status) };
        // Add optional KuCoin fields if provided
        if (kucoinOrderId)
            updateData.kucoinOrderId = kucoinOrderId;
        if (depositTxId)
            updateData.depositTxId = depositTxId;
        if (withdrawalTxId)
            updateData.withdrawalTxId = withdrawalTxId;
        if (depositAmount !== undefined)
            updateData.depositAmount = Number(depositAmount);
        // Update monitoring and completion flags based on status
        if (status === 'processing') {
            updateData.depositReceived = true;
            // 🤖 AUTOMATED SWAP INTEGRATION
            // Trigger automated swap when status changes to processing
            try {
                const exchange = yield ExchangeHistory_1.default.findOne({ exchangeId });
                if (exchange && exchange.kucoinDepositAddress) {
                    console.log(`🚀 Triggering automated swap for ${exchangeId} (status: processing)`);
                    // Create mock deposit event for automated swap processing
                    const mockDepositEvent = {
                        exchangeId: exchange.exchangeId,
                        txHash: depositTxId || `mock_tx_${Date.now()}`,
                        fromAddress: 'user_wallet_address',
                        toAddress: exchange.kucoinDepositAddress,
                        amount: (depositAmount || exchange.from.amount).toString(),
                        token: exchange.from.currency.toUpperCase(),
                        chain: 'ethereum', // Default chain
                        blockNumber: Date.now(),
                        confirmations: 12 // Assume sufficient confirmations
                    };
                    yield automatedSwapService_1.automatedSwapService.processDeposit(mockDepositEvent);
                }
            }
            catch (swapError) {
                console.error(`⚠️ Failed to trigger automated swap for ${exchangeId}:`, swapError.message);
                // Don't fail the status update if automated swap fails
            }
        }
        else if (status === 'completed') {
            updateData.swapCompleted = true;
            updateData.monitoringActive = false;
        }
        else if (status === 'failed' || status === 'expired') {
            updateData.monitoringActive = false;
        }
        const updated = yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, updateData, { new: true });
        if (!updated)
            return res.status(404).json({ message: 'Exchange not found' });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ message: 'Failed to update status', error: (err === null || err === void 0 ? void 0 : err.message) || String(err) });
    }
});
exports.updateExchangeStatus = updateExchangeStatus;
