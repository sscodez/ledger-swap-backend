"use strict";
/**
 * Token Management Controller
 * Admin endpoints for managing tokens on supported chains
 */
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
exports.searchTokens = exports.getTokenStats = exports.bulkCreateTokens = exports.deleteToken = exports.toggleTokenStatus = exports.updateToken = exports.createToken = exports.getTokensByChain = exports.getTokenByKey = exports.getAllTokens = exports.ChainEnum = void 0;
const Token_1 = __importDefault(require("../models/Token"));
const Chain_1 = __importDefault(require("../models/Chain"));
var ChainEnum;
(function (ChainEnum) {
    ChainEnum["XDC"] = "XDC";
    ChainEnum["BTC"] = "BTC";
    ChainEnum["IOTA"] = "IOTA";
    ChainEnum["XROP"] = "XROP";
    ChainEnum["XLM"] = "XLM";
})(ChainEnum || (exports.ChainEnum = ChainEnum = {}));
/**
 * Get all tokens
 *
 *
 *
 */
const getAllTokens = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chainKey, enabled } = req.query;
        const filter = {};
        if (chainKey)
            filter.chainKey = chainKey;
        if (enabled !== undefined)
            filter.enabled = enabled === 'true';
        const tokens = yield Token_1.default.find(filter)
            .sort({ liquidityScore: -1, symbol: 1 });
        res.json({
            success: true,
            count: tokens.length,
            tokens
        });
    }
    catch (error) {
        console.error('❌ Error getting tokens:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tokens',
            error: error.message
        });
    }
});
exports.getAllTokens = getAllTokens;
/**
 * Get token by key
 */
const getTokenByKey = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const token = yield Token_1.default.findOne({ key });
        if (!token) {
            return res.status(404).json({
                success: false,
                message: 'Token not found'
            });
        }
        res.json({
            success: true,
            token
        });
    }
    catch (error) {
        console.error('❌ Error getting token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get token',
            error: error.message
        });
    }
});
exports.getTokenByKey = getTokenByKey;
/**
 * Get tokens by chain
 */
const getTokensByChain = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chainKey } = req.params;
        // Verify chain exists
        const chain = yield Chain_1.default.findOne({ key: chainKey });
        if (!chain) {
            return res.status(404).json({
                success: false,
                message: 'Chain not found'
            });
        }
        const tokens = yield Token_1.default.find({ chainKey, enabled: true })
            .sort({ liquidityScore: -1, symbol: 1 });
        res.json({
            success: true,
            chain: chain.name,
            count: tokens.length,
            tokens
        });
    }
    catch (error) {
        console.error('❌ Error getting tokens by chain:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tokens',
            error: error.message
        });
    }
});
exports.getTokensByChain = getTokensByChain;
/**
 * Create new token (Admin only)
 */
const createToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tokenData = req.body;
        // Validate required fields
        if (!tokenData.name || !tokenData.chainKey || !tokenData.tokenAddress) {
            return res.status(400).json({
                success: false,
                message: 'Name, chainKey, and tokenAddress are required'
            });
        }
        // Check if token with same tokenAddress already exists
        const existingToken = yield Token_1.default.findOne({ tokenAddress: tokenData.tokenAddress });
        if (existingToken) {
            return res.status(400).json({
                success: false,
                message: 'Token with this address already exists'
            });
        }
        // Generate a unique key for the token to avoid null key issues
        const uniqueKey = `${tokenData.tokenAddress.toLowerCase()}-${tokenData.chainKey}`;
        // Create token with generated key
        const tokenToCreate = Object.assign(Object.assign({}, tokenData), { key: uniqueKey // Add the key field to avoid null key errors
         });
        const token = yield Token_1.default.create(tokenToCreate);
        res.status(201).json({
            success: true,
            message: 'Token created successfully',
            token
        });
    }
    catch (error) {
        console.error('❌ Error creating token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create token',
            error: error.message
        });
    }
});
exports.createToken = createToken;
/**
 * Update token (Admin only)
 */
const updateToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const updates = req.body;
        // Don't allow changing the key or chainKey
        delete updates.key;
        delete updates.chainKey;
        const token = yield Token_1.default.findOneAndUpdate({ key }, updates, { new: true, runValidators: true });
        if (!token) {
            return res.status(404).json({
                success: false,
                message: 'Token not found'
            });
        }
        res.json({
            success: true,
            message: 'Token updated successfully',
            token
        });
    }
    catch (error) {
        console.error('❌ Error updating token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update token',
            error: error.message
        });
    }
});
exports.updateToken = updateToken;
/**
 * Enable/disable token (Admin only)
 */
const toggleTokenStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const { enabled } = req.body;
        const token = yield Token_1.default.findOneAndUpdate({ key }, { enabled }, { new: true });
        if (!token) {
            return res.status(404).json({
                success: false,
                message: 'Token not found'
            });
        }
        res.json({
            success: true,
            message: `Token ${enabled ? 'enabled' : 'disabled'} successfully`,
            token
        });
    }
    catch (error) {
        console.error('❌ Error toggling token status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle token status',
            error: error.message
        });
    }
});
exports.toggleTokenStatus = toggleTokenStatus;
/**
 * Delete token (Admin only)
 */
const deleteToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const token = yield Token_1.default.findOneAndDelete({ key });
        if (!token) {
            return res.status(404).json({
                success: false,
                message: 'Token not found'
            });
        }
        res.json({
            success: true,
            message: 'Token deleted successfully',
            token
        });
    }
    catch (error) {
        console.error('❌ Error deleting token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete token',
            error: error.message
        });
    }
});
exports.deleteToken = deleteToken;
/**
 * Bulk create tokens (Admin only)
 */
const bulkCreateTokens = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tokens } = req.body;
        if (!Array.isArray(tokens) || tokens.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tokens array'
            });
        }
        // Auto-generate keys
        const processedTokens = tokens.map(token => {
            var _a;
            return (Object.assign(Object.assign({}, token), { key: token.key || `${(_a = token.symbol) === null || _a === void 0 ? void 0 : _a.toLowerCase()}-${token.chainKey}` }));
        });
        const createdTokens = yield Token_1.default.insertMany(processedTokens, { ordered: false });
        res.status(201).json({
            success: true,
            message: `${createdTokens.length} tokens created successfully`,
            count: createdTokens.length,
            tokens: createdTokens
        });
    }
    catch (error) {
        console.error('❌ Error bulk creating tokens:', error);
        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Some tokens already exist',
                error: 'Duplicate tokens found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create tokens',
            error: error.message
        });
    }
});
exports.bulkCreateTokens = bulkCreateTokens;
/**
 * Get token statistics
 */
const getTokenStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalTokens = yield Token_1.default.countDocuments();
        const enabledTokens = yield Token_1.default.countDocuments({ enabled: true });
        const disabledTokens = totalTokens - enabledTokens;
        const tokensByChain = yield Token_1.default.aggregate([
            { $group: { _id: '$chainKey', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const tokensByType = yield Token_1.default.aggregate([
            { $group: { _id: '$tokenType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const stablecoins = yield Token_1.default.countDocuments({ isStablecoin: true });
        res.json({
            success: true,
            stats: {
                total: totalTokens,
                enabled: enabledTokens,
                disabled: disabledTokens,
                stablecoins,
                byChain: tokensByChain,
                byType: tokensByType
            }
        });
    }
    catch (error) {
        console.error('❌ Error getting token stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get token statistics',
            error: error.message
        });
    }
});
exports.getTokenStats = getTokenStats;
/**
 * Search tokens
 */
const searchTokens = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query, chainKey, limit = 20 } = req.query;
        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Search query required'
            });
        }
        const searchRegex = new RegExp(query, 'i');
        const filter = {
            enabled: true,
            $or: [
                { symbol: searchRegex },
                { name: searchRegex }
            ]
        };
        if (chainKey) {
            filter.chainKey = chainKey;
        }
        const tokens = yield Token_1.default.find(filter)
            .limit(parseInt(limit))
            .sort({ liquidityScore: -1 });
        res.json({
            success: true,
            count: tokens.length,
            tokens
        });
    }
    catch (error) {
        console.error('❌ Error searching tokens:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search tokens',
            error: error.message
        });
    }
});
exports.searchTokens = searchTokens;
