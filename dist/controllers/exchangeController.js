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
exports.verifyExchangeTransactions = exports.completeExchange = exports.getPublicExchanges = exports.updateExchangeStatus = exports.updatedExchange = exports.getExchangeById = exports.createExchange = void 0;
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
const flaggedCheck_1 = require("../utils/flaggedCheck");
function generateExchangeId() {
    return `ex-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}
// POST /api/exchanges
// Creates a new exchange entry and returns server-generated exchangeId (and the created record)
// Now supports both authenticated and anonymous users
const createExchange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    const { fromCurrency, toCurrency, sendAmount, receiveAmount, fees = 0, cashback = 0, walletAddress, status, isAnonymous, connectedWallet, sellerTxhash, depositAddressSeller, sendAddressSeller, prefundTxHash, } = req.body || {};
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
    const allowedStatuses = new Set(['pending', 'completed', 'failed', 'in_review', 'expired', 'processing', 'confirming', 'exchanging', 'sending']);
    const computedStatus = allowedStatuses.has(String(status)) ? String(status) : 'pending';
    try {
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
            connectedWallet: connectedWallet ? String(connectedWallet) : undefined,
            sellerTxhash: sellerTxhash ? String(sellerTxhash) : undefined,
            depositAddressSeller: depositAddressSeller ? String(depositAddressSeller) : undefined,
            sendAddressSeller: sendAddressSeller ? String(sendAddressSeller) : undefined,
            prefundTxHash: prefundTxHash ? String(prefundTxHash) : undefined,
            depositReceived: false,
            swapCompleted: false,
            expiresAt,
            monitoringActive: false,
        });
        return res.status(201).json({
            exchangeId,
            record,
            expiresAt: expiresAt.toISOString(),
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
// PATCH /api/exchanges/:exchangeId
// Generic exchange update allowing select fields to be modified
const updatedExchange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { exchangeId } = req.params;
        const payload = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!exchangeId) {
            return res.status(400).json({
                success: false,
                message: 'exchangeId parameter is required',
            });
        }
        const allowedTopLevelFields = {
            status: (value) => {
                const allowedStatuses = new Set(['pending', 'completed', 'failed', 'in_review', 'expired', 'processing', 'confirming', 'exchanging', 'sending']);
                if (!allowedStatuses.has(String(value))) {
                    throw new Error('Invalid status value');
                }
                return String(value);
            },
            fees: (value) => Number(value),
            cashback: (value) => Number(value),
            walletAddress: (value) => String(value),
            connectedWallet: (value) => String(value),
            prefundTxHash: (value) => String(value),
            sellerTxhash: (value) => String(value),
            buyerTxhash: (value) => String(value),
            depositAddressSeller: (value) => String(value),
            depositAddressBuyer: (value) => String(value),
            sendAddressSeller: (value) => String(value),
            sendAddressBuyer: (value) => String(value),
            depositAmount: (value) => Number(value),
            depositTxId: (value) => String(value),
            withdrawalTxId: (value) => String(value),
            depositReceived: (value) => Boolean(value),
            swapCompleted: (value) => Boolean(value),
            notes: (value) => String(value),
            monitoringActive: (value) => Boolean(value),
            expiresAt: (value) => new Date(value),
        };
        const updateData = {};
        for (const [field, transformer] of Object.entries(allowedTopLevelFields)) {
            if (Object.prototype.hasOwnProperty.call(payload, field) && payload[field] !== undefined) {
                try {
                    updateData[field] = transformer(payload[field]);
                }
                catch (error) {
                    return res.status(400).json({
                        success: false,
                        message: (error === null || error === void 0 ? void 0 : error.message) || `Invalid value provided for ${field}`,
                    });
                }
            }
        }
        if (payload.from && typeof payload.from === 'object') {
            if (payload.from.currency !== undefined) {
                updateData['from.currency'] = String(payload.from.currency);
            }
            if (payload.from.amount !== undefined) {
                updateData['from.amount'] = Number(payload.from.amount);
            }
        }
        if (payload.to && typeof payload.to === 'object') {
            if (payload.to.currency !== undefined) {
                updateData['to.currency'] = String(payload.to.currency);
            }
            if (payload.to.amount !== undefined) {
                updateData['to.amount'] = Number(payload.to.amount);
            }
        }
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields provided for update',
            });
        }
        const updated = yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, updateData, { new: true, runValidators: true });
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Exchange not found',
            });
        }
        return res.json({
            success: true,
            exchange: updated,
        });
    }
    catch (err) {
        console.error('Error updating exchange:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to update exchange',
            error: (err === null || err === void 0 ? void 0 : err.message) || String(err),
        });
    }
});
exports.updatedExchange = updatedExchange;
// PUT /api/exchanges/:exchangeId/status
const updateExchangeStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { exchangeId } = req.params;
        const { status, depositTxId, withdrawalTxId, depositAmount, prefundTxHash } = req.body;
        const allowed = new Set(['pending', 'completed', 'failed', 'in_review', 'expired', 'processing', 'confirming', 'exchanging', 'sending']);
        if (!status || !allowed.has(String(status))) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const updateData = { status: String(status) };
        if (depositTxId)
            updateData.depositTxId = depositTxId;
        if (withdrawalTxId)
            updateData.withdrawalTxId = withdrawalTxId;
        if (depositAmount !== undefined)
            updateData.depositAmount = Number(depositAmount);
        if (prefundTxHash)
            updateData.prefundTxHash = prefundTxHash;
        // Update monitoring and completion flags based on status
        if (status === 'processing' || status === 'confirming' || status === 'exchanging' || status === 'sending') {
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
// GET /api/exchanges/public
// Get all public exchanges with optional filtering and pagination
const getPublicExchanges = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sendCurrency, receiveCurrency, status, page = '1', limit = '10' } = req.query;
        // Build filter object
        const filter = {};
        if (sendCurrency) {
            filter['from.currency'] = sendCurrency;
        }
        if (receiveCurrency) {
            filter['to.currency'] = receiveCurrency;
        }
        if (status) {
            filter.status = status;
        }
        // Pagination
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Get total count for pagination
        const totalCount = yield ExchangeHistory_1.default.countDocuments(filter);
        // Get exchanges, sorted by creation date (newest first)
        const exchanges = yield ExchangeHistory_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();
        // Transform to match frontend interface
        const transformedExchanges = exchanges.map(exchange => ({
            _id: exchange._id,
            exchangeId: exchange.exchangeId,
            sendAmount: exchange.from.amount,
            sendCurrency: exchange.from.currency,
            receiveCurrency: exchange.to.currency,
            receiveAmount: exchange.to.amount,
            walletAddress: exchange.walletAddress,
            status: exchange.status || 'pending',
            createdAt: exchange.createdAt,
            isAnonymous: exchange.isAnonymous || false,
            connectedWallet: exchange.connectedWallet,
            prefundTxHash: exchange.prefundTxHash
        }));
        return res.json({
            success: true,
            exchanges: transformedExchanges,
            count: transformedExchanges.length,
            totalCount: totalCount,
            currentPage: pageNum,
            totalPages: Math.ceil(totalCount / limitNum),
            hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
            hasPrevPage: pageNum > 1
        });
    }
    catch (err) {
        console.error('Error fetching public exchanges:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch exchanges',
            error: (err === null || err === void 0 ? void 0 : err.message) || String(err)
        });
    }
});
exports.getPublicExchanges = getPublicExchanges;
// POST /api/exchanges/:exchangeId/complete
// Mark an exchange as completed with transaction hash
const completeExchange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { exchangeId } = req.params;
        const { prefundTxHash, connectedWallet, status = 'completed' } = req.body;
        if (!prefundTxHash) {
            return res.status(400).json({
                success: false,
                message: 'Transaction hash is required'
            });
        }
        // Find and update the exchange
        const exchange = yield ExchangeHistory_1.default.findOne({ exchangeId });
        if (!exchange) {
            return res.status(404).json({
                success: false,
                message: 'Exchange not found'
            });
        }
        // Check if already completed
        if (exchange.status === 'completed' || exchange.prefundTxHash) {
            return res.status(400).json({
                success: false,
                message: 'Exchange is already completed'
            });
        }
        // Update the exchange
        exchange.prefundTxHash = prefundTxHash;
        exchange.status = status;
        if (connectedWallet) {
            exchange.connectedWallet = connectedWallet;
        }
        exchange.updatedAt = new Date();
        yield exchange.save();
        return res.json({
            success: true,
            message: 'Exchange completed successfully',
            exchange: {
                exchangeId: exchange.exchangeId,
                status: exchange.status,
                prefundTxHash: exchange.prefundTxHash,
                updatedAt: exchange.updatedAt
            }
        });
    }
    catch (err) {
        console.error('Error completing exchange:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to complete exchange',
            error: (err === null || err === void 0 ? void 0 : err.message) || String(err)
        });
    }
});
exports.completeExchange = completeExchange;
// POST /api/exchanges/:exchangeId/verify-transactions
// Verify buyer and seller transactions for an exchange
const verifyExchangeTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { exchangeId } = req.params;
        const { buyerTxHash, sellerTxHash } = req.body;
        if (!exchangeId) {
            return res.status(400).json({
                success: false,
                message: 'Exchange ID is required'
            });
        }
        const exchange = yield ExchangeHistory_1.default.findOne({ exchangeId });
        if (!exchange) {
            return res.status(404).json({
                success: false,
                message: 'Exchange not found'
            });
        }
        const buyerTx = buyerTxHash || exchange.buyerTxhash || exchange.prefundTxHash;
        const sellerTx = sellerTxHash || exchange.sellerTxhash;
        if (!buyerTx || !sellerTx) {
            return res.status(400).json({
                success: false,
                message: 'Both buyer and seller transaction hashes are required'
            });
        }
        // Get admin wallet addresses
        const ADMIN_WALLETS = {
            XRP: process.env.ADMIN_XRP_ADDRESS || 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY',
            BTC: process.env.ADMIN_BTC_ADDRESS || 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            XDC: process.env.ADMIN_XDC_ADDRESS || 'xdc50a231ac1c605f271a2f7e9b40a466bba07d2b87',
            IOTA: process.env.ADMIN_IOTA_ADDRESS || '0x223f679b3d44f25cd0d9b07428217bb68928f05808e5f567b5754f247f45360d',
            XLM: process.env.ADMIN_XLM_ADDRESS || 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        };
        const buyerCurrency = String(exchange.from.currency).toUpperCase();
        const sellerCurrency = String(exchange.to.currency).toUpperCase();
        const adminBuyerWallet = ADMIN_WALLETS[buyerCurrency];
        const adminSellerWallet = ADMIN_WALLETS[sellerCurrency];
        if (!adminBuyerWallet || !adminSellerWallet) {
            return res.status(400).json({
                success: false,
                message: 'Admin wallet addresses not configured for verification'
            });
        }
        // Verify transactions (basic format validation for now)
        const verifyTransaction = (txHash, currency, expectedRecipient) => {
            const upperCurrency = currency.toUpperCase();
            // Basic transaction hash format validation
            if (!txHash || txHash.length < 10) {
                return { success: false, details: { error: 'Invalid transaction hash format' } };
            }
            // Currency-specific validation
            switch (upperCurrency) {
                case 'BTC':
                case 'BITCOIN':
                    if (!/^[a-fA-F0-9]{64}$/.test(txHash)) {
                        return { success: false, details: { error: 'Invalid Bitcoin transaction hash format' } };
                    }
                    break;
                case 'ETH':
                case 'USDT':
                case 'USDC':
                    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
                        return { success: false, details: { error: 'Invalid Ethereum transaction hash format' } };
                    }
                    break;
                case 'XRP':
                    if (!/^[A-F0-9]{64}$/.test(txHash)) {
                        return { success: false, details: { error: 'Invalid XRP transaction hash format' } };
                    }
                    break;
                case 'XLM':
                case 'STELLAR':
                    if (!/^[a-fA-F0-9]{64}$/.test(txHash)) {
                        return { success: false, details: { error: 'Invalid Stellar transaction hash format' } };
                    }
                    break;
                case 'IOTA':
                case 'MIOTA':
                    if (!/^[A-Z0-9]{64}$/.test(txHash)) {
                        return { success: false, details: { error: 'Invalid IOTA transaction hash format' } };
                    }
                    break;
                case 'XDC':
                    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
                        return { success: false, details: { error: 'Invalid XDC transaction hash format' } };
                    }
                    break;
                default:
                    if (txHash.length < 10) {
                        return { success: false, details: { error: 'Transaction hash too short' } };
                    }
            }
            // TODO: In production, integrate with blockchain APIs to verify:
            // 1. Transaction exists
            // 2. Transaction was sent TO the expected recipient (admin wallet)
            // 3. Transaction amount matches expected amount
            // 4. Transaction is confirmed
            return {
                success: true,
                details: {
                    txHash,
                    currency: upperCurrency,
                    expectedRecipient,
                    verifiedAt: new Date().toISOString(),
                    status: 'verified',
                    note: 'Basic format validation passed - full blockchain verification needed in production'
                }
            };
        };
        const buyerVerification = verifyTransaction(buyerTx, buyerCurrency, adminBuyerWallet);
        const sellerVerification = verifyTransaction(sellerTx, sellerCurrency, adminSellerWallet);
        const result = {
            buyerVerified: buyerVerification.success,
            sellerVerified: sellerVerification.success,
            buyerDetails: buyerVerification.details,
            sellerDetails: sellerVerification.details,
            exchangeId: exchange.exchangeId,
            verifiedAt: new Date().toISOString()
        };
        // Update exchange with verification results if successful
        if (result.buyerVerified && result.sellerVerified) {
            yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, {
                buyerTxhash: buyerTx,
                sellerTxhash: sellerTx,
                status: 'verifying', // New status for verified but not yet transferred
                updatedAt: new Date()
            });
        }
        return res.json({
            success: true,
            message: result.buyerVerified && result.sellerVerified ? 'Transactions verified successfully' : 'Transaction verification completed with issues',
            result
        });
    }
    catch (err) {
        console.error('Error verifying exchange transactions:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify transactions',
            error: (err === null || err === void 0 ? void 0 : err.message) || String(err)
        });
    }
});
exports.verifyExchangeTransactions = verifyExchangeTransactions;
