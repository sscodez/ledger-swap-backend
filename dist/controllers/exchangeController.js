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
const kucoin_1 = require("../utils/kucoin");
function generateExchangeId() {
    return `EX-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}
// POST /api/exchanges
// Creates a new exchange entry and returns server-generated exchangeId (and the created record)
// Now supports both authenticated and anonymous users
const createExchange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    const { fromCurrency, toCurrency, sendAmount, receiveAmount, fees = 0, cashback = 0, walletAddress, status } = req.body || {};
    if (!fromCurrency || !toCurrency) {
        return res.status(400).json({ message: 'fromCurrency and toCurrency are required' });
    }
    // Check if user or recipient address is flagged (only if user is authenticated)
    if (authReq.user) {
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
    const exchangeId = generateExchangeId();
    const allowedStatuses = new Set(['pending', 'completed', 'failed', 'in_review', 'expired', 'processing']);
    const computedStatus = allowedStatuses.has(String(status)) ? String(status) : 'pending';
    try {
        // Generate KuCoin deposit address for the fromCurrency
        let kucoinDepositAddress = null;
        let kucoinDepositCurrency = null;
        const fromCurrencyUpper = String(fromCurrency).toUpperCase();
        if (kucoin_1.SUPPORTED_CHAINS[fromCurrencyUpper]) {
            const chainConfig = kucoin_1.SUPPORTED_CHAINS[fromCurrencyUpper];
            console.log(`🏦 Generating deposit address for ${fromCurrencyUpper}...`);
            try {
                const depositAddressResult = yield (0, kucoin_1.getOrCreateDepositAddress)(chainConfig.currency, chainConfig.chain);
                if (depositAddressResult && depositAddressResult.address) {
                    kucoinDepositAddress = depositAddressResult.address;
                    kucoinDepositCurrency = chainConfig.currency;
                    console.log(`✅ Generated deposit address: ${kucoinDepositAddress}`);
                }
            }
            catch (depositError) {
                console.error('❌ Failed to generate deposit address:', depositError.message);
                // Continue without deposit address - can be generated later
            }
        }
        // Set expiration time (5 minutes from now)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        const record = yield ExchangeHistory_1.default.create({
            user: authReq.user ? authReq.user._id : null, // Allow null for anonymous exchanges
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
            isAnonymous: !authReq.user, // Track if this is an anonymous exchange
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
        return res.status(201).json({
            exchangeId,
            record,
            depositAddress: kucoinDepositAddress,
            expiresAt: expiresAt.toISOString()
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
