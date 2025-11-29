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
exports.adminCreateToken = exports.adminSetTokenEnabled = exports.adminListTokens = exports.adminSetChainEnabled = exports.adminListChains = exports.updateUserRole = exports.listAllTransactions = exports.listFlaggedAddresses = exports.getAdminMetrics = exports.getFeeRevenueLastNDays = exports.updateSwapFeePercent = exports.getPlatformSettings = exports.listTradeActivity = exports.updatePlatformSettings = exports.listSupportMessages = exports.sendSupportEmail = exports.adminDeleteFlaggedAddress = exports.adminFlagAddress = exports.listUsers = void 0;
const SupportMessage_1 = __importDefault(require("../models/SupportMessage"));
const emailService_1 = require("../services/emailService");
const User_1 = __importDefault(require("../models/User"));
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
const Address_1 = __importDefault(require("../models/Address"));
const PlatformSettings_1 = __importDefault(require("../models/PlatformSettings"));
const listUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield User_1.default.find({}).select('-password').sort({ createdAt: -1 });
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to list users', error: err.message });
    }
});
exports.listUsers = listUsers;
// Admin: flag a wallet address (create or update)
const adminFlagAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { coin, network, address, reason } = req.body;
        if (!coin || !network || !address) {
            return res.status(400).json({ message: 'coin, network, and address are required' });
        }
        // Check if address is already flagged
        const existingAddress = yield Address_1.default.findOne({ address: address.trim() });
        if (existingAddress && existingAddress.flagged) {
            return res.status(409).json({
                message: 'This address is already flagged',
                existing: {
                    address: existingAddress.address,
                    coin: existingAddress.coin,
                    network: existingAddress.network,
                    flaggedAt: existingAddress.flaggedAt,
                    flaggedReason: existingAddress.flaggedReason
                }
            });
        }
        const authReq = req;
        const now = new Date();
        const update = {
            coin: coin.trim(),
            network: network.trim(),
            address: address.trim(),
            label: 'flagged',
            flagged: true,
            flaggedAt: now,
        };
        if (reason && reason.trim())
            update.flaggedReason = reason.trim();
        // attach the admin user as creator/owner to satisfy schema requirement
        if ((_a = authReq.user) === null || _a === void 0 ? void 0 : _a._id)
            update.user = authReq.user._id;
        // Upsert by unique address
        const doc = yield Address_1.default.findOneAndUpdate({ address: address.trim() }, { $set: update }, { new: true, upsert: true });
        res.status(201).json(doc);
    }
    catch (err) {
        // Handle MongoDB duplicate key error
        if (err.code === 11000) {
            return res.status(409).json({ message: 'This address is already in the system' });
        }
        res.status(500).json({ message: 'Failed to flag address', error: err.message });
    }
});
exports.adminFlagAddress = adminFlagAddress;
// Admin: delete a flagged address
const adminDeleteFlaggedAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Address ID is required' });
        }
        // Find and delete the flagged address
        const deletedAddress = yield Address_1.default.findByIdAndDelete(id);
        if (!deletedAddress) {
            return res.status(404).json({ message: 'Flagged address not found' });
        }
        res.json({
            message: 'Flagged address deleted successfully',
            deletedAddress: {
                id: deletedAddress._id,
                address: deletedAddress.address,
                coin: deletedAddress.coin,
                network: deletedAddress.network
            }
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to delete flagged address', error: err.message });
    }
});
exports.adminDeleteFlaggedAddress = adminDeleteFlaggedAddress;
// Send support email (admin -> support mailbox)
const sendSupportEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { subject, message, fromEmail } = req.body;
        if (!subject || !message) {
            return res.status(400).json({ message: 'subject and message are required' });
        }
        const authReq = req;
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@ledgerswap.io';
        try {
            // Attempt to send email using the email service
            const emailResult = yield (0, emailService_1.sendAdminSupportEmail)(subject, message, fromEmail);
            const isSmtpConfigured = emailResult.mode === 'smtp';
            if (emailResult.success) {
                // Save record with appropriate status
                yield SupportMessage_1.default.create({
                    subject,
                    message,
                    fromEmail,
                    toEmail: adminEmail,
                    status: isSmtpConfigured ? 'sent' : 'accepted',
                    error: isSmtpConfigured ? undefined : 'SMTP not configured - message logged only',
                    createdBy: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a._id,
                });
                if (isSmtpConfigured) {
                    return res.status(200).json({ message: 'Support email sent successfully to admin@ledgerswap.io' });
                }
                else {
                    return res.status(202).json({ message: 'Support request logged successfully. Email delivery requires SMTP configuration.' });
                }
            }
            else {
                // Email failed to send, save as failed
                yield SupportMessage_1.default.create({
                    subject,
                    message,
                    fromEmail,
                    toEmail: adminEmail,
                    status: 'failed',
                    error: emailResult.error || 'Email service failed to send message',
                    createdBy: (_b = authReq.user) === null || _b === void 0 ? void 0 : _b._id,
                });
                return res.status(500).json({ message: emailResult.error || 'Failed to send support email. Please check SMTP configuration.' });
            }
        }
        catch (emailError) {
            console.error('Support email error:', emailError);
            // Save record as accepted (logged but not sent)
            yield SupportMessage_1.default.create({
                subject,
                message,
                fromEmail,
                toEmail: adminEmail,
                status: 'accepted',
                error: 'SMTP not configured - message logged only',
                createdBy: (_c = authReq.user) === null || _c === void 0 ? void 0 : _c._id,
            });
            return res.status(202).json({
                message: 'Support request logged. Email delivery requires SMTP configuration.'
            });
        }
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to process support email', error: err.message });
    }
});
exports.sendSupportEmail = sendSupportEmail;
// List support messages (admin)
const listSupportMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = '1', limit = '20', sort = '-createdAt' } = req.query;
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.max(Math.min(parseInt(limit, 10) || 20, 100), 1);
        const [items, total] = yield Promise.all([
            SupportMessage_1.default.find({}).sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum),
            SupportMessage_1.default.countDocuments({}),
        ]);
        res.json({
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
            items,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to list support messages', error: err.message });
    }
});
exports.listSupportMessages = listSupportMessages;
// Update general platform settings (partial update)
const updatePlatformSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { privacyMode, autoRefreshDashboard, notificationSettings, loginRateLimitPerHour } = req.body;
        const updates = {};
        if (typeof privacyMode === 'boolean')
            updates.privacyMode = privacyMode;
        if (typeof autoRefreshDashboard === 'boolean')
            updates.autoRefreshDashboard = autoRefreshDashboard;
        if (notificationSettings && typeof notificationSettings.alertsEnabled === 'boolean') {
            updates['notificationSettings.alertsEnabled'] = notificationSettings.alertsEnabled;
        }
        if (typeof loginRateLimitPerHour === 'number' && loginRateLimitPerHour >= 0) {
            updates.loginRateLimitPerHour = Math.floor(loginRateLimitPerHour);
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No valid settings provided' });
        }
        const updated = yield PlatformSettings_1.default.findOneAndUpdate({ key: 'default' }, { $set: updates }, { new: true, upsert: true });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to update platform settings', error: err.message });
    }
});
exports.updatePlatformSettings = updatePlatformSettings;
// Trade Activity Monitor: list swaps with Wallet address, Swap details, Network, Status, Time
const listTradeActivity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = '1', limit = '20', walletAddress, network, status, startDate, endDate, sort = '-createdAt', } = req.query;
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.max(Math.min(parseInt(limit, 10) || 20, 100), 1);
        const query = {};
        if (walletAddress)
            query.walletAddress = { $regex: walletAddress, $options: 'i' };
        if (network)
            query.network = network;
        if (status)
            query.status = status;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate)
                query.createdAt.$gte = new Date(startDate);
            if (endDate)
                query.createdAt.$lte = new Date(endDate);
        }
        const [items, total] = yield Promise.all([
            ExchangeHistory_1.default.find(query)
                .select('walletAddress from to network status createdAt prefundTxHash')
                .sort(sort)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            ExchangeHistory_1.default.countDocuments(query),
        ]);
        // Map to required shape (explicit naming)
        const mapped = items.map((it) => ({
            walletAddress: it.walletAddress || null,
            swap: { from: it.from, to: it.to },
            network: it.network || null,
            status: it.status,
            time: it.createdAt,
            prefundTxHash: it.prefundTxHash || null,
        }));
        res.json({
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
            items: mapped,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to list trade activity', error: err.message });
    }
});
exports.listTradeActivity = listTradeActivity;
// Get platform settings (swap fee percent)
const getPlatformSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doc = yield PlatformSettings_1.default.findOne({ key: 'default' });
        res.json(doc || { key: 'default', swapFeePercent: 0, privacyMode: false, autoRefreshDashboard: false, notificationSettings: { alertsEnabled: false }, loginRateLimitPerHour: 5 });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to get settings', error: err.message });
    }
});
exports.getPlatformSettings = getPlatformSettings;
// Update platform swap fee percent (0 to 100)
const updateSwapFeePercent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { swapFeePercent } = req.body;
        if (typeof swapFeePercent !== 'number' || swapFeePercent < 0 || swapFeePercent > 100) {
            return res.status(400).json({ message: 'swapFeePercent must be a number between 0 and 100' });
        }
        const updated = yield PlatformSettings_1.default.findOneAndUpdate({ key: 'default' }, { swapFeePercent }, { new: true, upsert: true });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to update swap fee', error: err.message });
    }
});
exports.updateSwapFeePercent = updateSwapFeePercent;
// Get fee revenue (last N days, default 30) grouped by day
const getFeeRevenueLastNDays = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const daysParam = parseInt(req.query.days || '30', 10);
        const days = isNaN(daysParam) ? 30 : Math.min(Math.max(daysParam, 1), 365);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const agg = yield ExchangeHistory_1.default.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, totalFees: { $sum: '$fees' } } },
            { $sort: { _id: 1 } },
        ]);
        const map = {};
        agg.forEach((d) => { map[d._id] = d.totalFees; });
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const key = d.toISOString().slice(0, 10);
            result.push({ date: key, totalFees: map[key] || 0 });
        }
        res.json({ days, since: since.toISOString(), items: result });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to compute fee revenue', error: err.message });
    }
});
exports.getFeeRevenueLastNDays = getFeeRevenueLastNDays;
// Admin metrics: Recent Swaps, Total Swaps Today, Volume (24h), Active Users (24h), Platform Fees (24h & total)
const getAdminMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        // Total swaps today (completed)
        const totalSwapsToday = yield ExchangeHistory_1.default.countDocuments({
            status: 'completed',
            createdAt: { $gte: startOfDay },
        });
        // Active users in last 24h (any status)
        const activeUsersAgg = yield ExchangeHistory_1.default.aggregate([
            { $match: { createdAt: { $gte: since24h } } },
            { $group: { _id: '$user' } },
            { $count: 'count' },
        ]);
        const activeUsers24h = ((_a = activeUsersAgg[0]) === null || _a === void 0 ? void 0 : _a.count) || 0;
        // Volume (24h): sum of "to.amount" for completed swaps in last 24h
        const volume24hAgg = yield ExchangeHistory_1.default.aggregate([
            { $match: { status: 'completed', createdAt: { $gte: since24h } } },
            { $group: { _id: null, total: { $sum: '$to.amount' } } },
        ]);
        const volume24h = ((_b = volume24hAgg[0]) === null || _b === void 0 ? void 0 : _b.total) || 0;
        // Platform fees (24h) and total
        const fees24hAgg = yield ExchangeHistory_1.default.aggregate([
            { $match: { createdAt: { $gte: since24h } } },
            { $group: { _id: null, total: { $sum: '$fees' } } },
        ]);
        const fees24h = ((_c = fees24hAgg[0]) === null || _c === void 0 ? void 0 : _c.total) || 0;
        const feesTotalAgg = yield ExchangeHistory_1.default.aggregate([
            { $group: { _id: null, total: { $sum: '$fees' } } },
        ]);
        const feesTotal = ((_d = feesTotalAgg[0]) === null || _d === void 0 ? void 0 : _d.total) || 0;
        // Recent swaps (latest 10)
        const recentSwaps = yield ExchangeHistory_1.default.find({})
            .populate('user', 'name email role')
            .sort({ createdAt: -1 })
            .limit(10);
        res.json({
            totals: {
                totalSwapsToday,
                activeUsers24h,
                volume24h,
                fees24h,
                feesTotal,
            },
            recentSwaps,
            window: {
                startOfDay: startOfDay.toISOString(),
                since24h: since24h.toISOString(),
                now: now.toISOString(),
            },
            notes: 'Volume is computed as sum of to.amount for completed swaps in the last 24h.'
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to compute metrics', error: err.message });
    }
});
exports.getAdminMetrics = getAdminMetrics;
// List flagged wallet addresses only (no user PII)
const listFlaggedAddresses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = '1', limit = '20', coin, network, q, // search in address
        sort = '-flaggedAt', } = req.query;
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.max(Math.min(parseInt(limit, 10) || 20, 100), 1);
        const query = { flagged: true };
        if (coin)
            query.coin = coin;
        if (network)
            query.network = network;
        if (q)
            query.address = { $regex: q, $options: 'i' };
        const [items, total] = yield Promise.all([
            Address_1.default.find(query)
                .select('address coin network flaggedReason flaggedAt createdAt updatedAt')
                .sort(sort)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            Address_1.default.countDocuments(query),
        ]);
        res.json({
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
            items,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to list flagged addresses', error: err.message });
    }
});
exports.listFlaggedAddresses = listFlaggedAddresses;
const listAllTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = '1', limit = '20', status, user, sort = '-createdAt', startDate, endDate, } = req.query;
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.max(Math.min(parseInt(limit, 10) || 20, 100), 1);
        const query = {};
        if (status)
            query.status = status;
        if (user)
            query.user = user;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate)
                query.createdAt.$gte = new Date(startDate);
            if (endDate)
                query.createdAt.$lte = new Date(endDate);
        }
        const [items, total] = yield Promise.all([
            ExchangeHistory_1.default.find(query)
                .populate('user', 'name email role')
                .sort(sort)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            ExchangeHistory_1.default.countDocuments(query),
        ]);
        res.json({
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
            items,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to list transactions', error: err.message });
    }
});
exports.listAllTransactions = listAllTransactions;
const updateUserRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!role || (role !== 'user' && role !== 'admin')) {
            return res.status(400).json({ message: 'Invalid role. Must be "user" or "admin"' });
        }
        const user = yield User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.role = role;
        yield user.save();
        const sanitized = yield User_1.default.findById(id).select('-password');
        res.json({ message: 'Role updated', user: sanitized });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to update role', error: err.message });
    }
});
exports.updateUserRole = updateUserRole;
// Token and Chain Management Controllers
// Mock data for chains and tokens (replace with actual database models)
const mockChains = [
    { key: 'ethereum', name: 'Ethereum', enabled: true },
    { key: 'bitcoin', name: 'Bitcoin', enabled: true },
    { key: 'solana', name: 'Solana', enabled: true },
    { key: 'binance-smart-chain', name: 'Binance Smart Chain', enabled: true },
    { key: 'polygon', name: 'Polygon', enabled: true },
    { key: 'avalanche', name: 'Avalanche', enabled: false },
    { key: 'cardano', name: 'Cardano', enabled: false },
    { key: 'polkadot', name: 'Polkadot', enabled: false },
    { key: 'tron', name: 'Tron', enabled: true },
    { key: 'xdc-network', name: 'XDC Network', enabled: false },
];
let mockTokens = [
    { key: 'btc-bitcoin', symbol: 'BTC', name: 'Bitcoin', chainKey: 'bitcoin', enabled: true },
    { key: 'eth-ethereum', symbol: 'ETH', name: 'Ethereum', chainKey: 'ethereum', enabled: true },
    { key: 'usdt-ethereum', symbol: 'USDT', name: 'Tether', chainKey: 'ethereum', enabled: true },
    { key: 'usdt-tron', symbol: 'USDT', name: 'Tether', chainKey: 'tron', enabled: true },
    { key: 'sol-solana', symbol: 'SOL', name: 'Solana', chainKey: 'solana', enabled: true },
];
const adminListChains = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json(mockChains);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to list chains', error: err.message });
    }
});
exports.adminListChains = adminListChains;
const adminSetChainEnabled = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const { enabled } = req.body;
        const chain = mockChains.find(c => c.key === key);
        if (!chain) {
            return res.status(404).json({ message: 'Chain not found' });
        }
        chain.enabled = enabled;
        res.json(chain);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to update chain', error: err.message });
    }
});
exports.adminSetChainEnabled = adminSetChainEnabled;
const adminListTokens = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json(mockTokens);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to list tokens', error: err.message });
    }
});
exports.adminListTokens = adminListTokens;
const adminSetTokenEnabled = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const { enabled } = req.body;
        const token = mockTokens.find(t => t.key === key);
        if (!token) {
            return res.status(404).json({ message: 'Token not found' });
        }
        token.enabled = enabled;
        res.json(token);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to update token', error: err.message });
    }
});
exports.adminSetTokenEnabled = adminSetTokenEnabled;
const adminCreateToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { symbol, name, chainKey, enabled = true } = req.body;
        if (!symbol || !name || !chainKey) {
            return res.status(400).json({ message: 'symbol, name, and chainKey are required' });
        }
        // Check if chain exists
        const chain = mockChains.find(c => c.key === chainKey);
        if (!chain) {
            return res.status(400).json({ message: 'Chain not found' });
        }
        // Generate a unique key for the token
        const tokenKey = `${symbol.toLowerCase()}-${chainKey}`;
        // Check if token already exists
        const existingToken = mockTokens.find(t => t.key === tokenKey);
        if (existingToken) {
            return res.status(400).json({ message: 'Token already exists on this chain' });
        }
        const newToken = {
            key: tokenKey,
            symbol: symbol.toUpperCase(),
            name,
            chainKey,
            enabled,
        };
        mockTokens.push(newToken);
        res.status(201).json(newToken);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to create token', error: err.message });
    }
});
exports.adminCreateToken = adminCreateToken;
