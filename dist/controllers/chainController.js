"use strict";
/**
 * Chain Management Controller
 * Admin endpoints for managing supported blockchains
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
exports.getChainStats = exports.deleteChain = exports.toggleChainStatus = exports.updateChain = exports.createChain = exports.getChainByKey = exports.getAllChains = void 0;
const Chain_1 = __importDefault(require("../models/Chain"));
/**
 * Get all chains
 */
const getAllChains = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const chains = yield Chain_1.default.find().sort({ name: 1 });
        res.json({
            success: true,
            count: chains.length,
            chains
        });
    }
    catch (error) {
        console.error('❌ Error getting chains:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get chains',
            error: error.message
        });
    }
});
exports.getAllChains = getAllChains;
/**
 * Get chain by key
 */
const getChainByKey = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const chain = yield Chain_1.default.findOne({ key });
        if (!chain) {
            return res.status(404).json({
                success: false,
                message: 'Chain not found'
            });
        }
        res.json({
            success: true,
            chain
        });
    }
    catch (error) {
        console.error('❌ Error getting chain:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get chain',
            error: error.message
        });
    }
});
exports.getChainByKey = getChainByKey;
/**
 * Create new chain (Admin only)
 */
const createChain = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const chainData = req.body;
        // Check if chain already exists
        const existingChain = yield Chain_1.default.findOne({ key: chainData.key });
        if (existingChain) {
            return res.status(400).json({
                success: false,
                message: 'Chain with this key already exists'
            });
        }
        const chain = yield Chain_1.default.create(chainData);
        res.status(201).json({
            success: true,
            message: 'Chain created successfully',
            chain
        });
    }
    catch (error) {
        console.error('❌ Error creating chain:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create chain',
            error: error.message
        });
    }
});
exports.createChain = createChain;
/**
 * Update chain (Admin only)
 */
const updateChain = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const updates = req.body;
        // Don't allow changing the key
        delete updates.key;
        const chain = yield Chain_1.default.findOneAndUpdate({ key }, updates, { new: true, runValidators: true });
        if (!chain) {
            return res.status(404).json({
                success: false,
                message: 'Chain not found'
            });
        }
        res.json({
            success: true,
            message: 'Chain updated successfully',
            chain
        });
    }
    catch (error) {
        console.error('❌ Error updating chain:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update chain',
            error: error.message
        });
    }
});
exports.updateChain = updateChain;
/**
 * Enable/disable chain (Admin only)
 */
const toggleChainStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const { enabled } = req.body;
        const chain = yield Chain_1.default.findOneAndUpdate({ key }, { enabled }, { new: true });
        if (!chain) {
            return res.status(404).json({
                success: false,
                message: 'Chain not found'
            });
        }
        res.json({
            success: true,
            message: `Chain ${enabled ? 'enabled' : 'disabled'} successfully`,
            chain
        });
    }
    catch (error) {
        console.error('❌ Error toggling chain status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle chain status',
            error: error.message
        });
    }
});
exports.toggleChainStatus = toggleChainStatus;
/**
 * Delete chain (Admin only)
 */
const deleteChain = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const chain = yield Chain_1.default.findOneAndDelete({ key });
        if (!chain) {
            return res.status(404).json({
                success: false,
                message: 'Chain not found'
            });
        }
        res.json({
            success: true,
            message: 'Chain deleted successfully',
            chain
        });
    }
    catch (error) {
        console.error('❌ Error deleting chain:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete chain',
            error: error.message
        });
    }
});
exports.deleteChain = deleteChain;
/**
 * Get chain statistics
 */
const getChainStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalChains = yield Chain_1.default.countDocuments();
        const enabledChains = yield Chain_1.default.countDocuments({ enabled: true });
        const disabledChains = totalChains - enabledChains;
        const chainsByType = yield Chain_1.default.aggregate([
            { $group: { _id: '$chainType', count: { $sum: 1 } } }
        ]);
        res.json({
            success: true,
            stats: {
                total: totalChains,
                enabled: enabledChains,
                disabled: disabledChains,
                byType: chainsByType
            }
        });
    }
    catch (error) {
        console.error('❌ Error getting chain stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get chain statistics',
            error: error.message
        });
    }
});
exports.getChainStats = getChainStats;
