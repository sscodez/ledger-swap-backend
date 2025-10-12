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
exports.calculateFee = exports.toggleCryptoFeeStatus = exports.deleteCryptoFee = exports.updateCryptoFee = exports.createCryptoFee = exports.getCryptoFeeBySymbol = exports.getCryptoFeeById = exports.getAllCryptoFees = void 0;
const CryptoFee_1 = __importDefault(require("../models/CryptoFee"));
// Get all crypto fees
const getAllCryptoFees = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fees = yield CryptoFee_1.default.find().sort({ cryptocurrency: 1 });
        res.json({
            success: true,
            data: fees
        });
    }
    catch (error) {
        console.error('Error fetching crypto fees:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch crypto fees',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getAllCryptoFees = getAllCryptoFees;
// Get crypto fee by ID
const getCryptoFeeById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const fee = yield CryptoFee_1.default.findById(id);
        if (!fee) {
            return res.status(404).json({
                success: false,
                message: 'Crypto fee not found'
            });
        }
        res.json({
            success: true,
            data: fee
        });
    }
    catch (error) {
        console.error('Error fetching crypto fee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch crypto fee',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getCryptoFeeById = getCryptoFeeById;
// Get crypto fee by symbol
const getCryptoFeeBySymbol = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { symbol } = req.params;
        const fee = yield CryptoFee_1.default.findOne({ symbol: symbol.toUpperCase(), isActive: true });
        if (!fee) {
            return res.status(404).json({
                success: false,
                message: 'Crypto fee not found for symbol'
            });
        }
        res.json({
            success: true,
            data: fee
        });
    }
    catch (error) {
        console.error('Error fetching crypto fee by symbol:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch crypto fee',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getCryptoFeeBySymbol = getCryptoFeeBySymbol;
// Create new crypto fee
const createCryptoFee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { cryptocurrency, symbol, feePercentage, minimumFee, maximumFee, isActive } = req.body;
        // Validate required fields
        if (!cryptocurrency || !symbol || feePercentage === undefined || minimumFee === undefined || maximumFee === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }
        // Check if crypto fee already exists
        const existingFee = yield CryptoFee_1.default.findOne({
            $or: [
                { cryptocurrency },
                { symbol: symbol.toUpperCase() }
            ]
        });
        if (existingFee) {
            return res.status(409).json({
                success: false,
                message: 'Crypto fee already exists for this cryptocurrency or symbol'
            });
        }
        const newFee = new CryptoFee_1.default({
            cryptocurrency,
            symbol: symbol.toUpperCase(),
            feePercentage,
            minimumFee,
            maximumFee,
            isActive: isActive !== undefined ? isActive : true
        });
        const savedFee = yield newFee.save();
        res.status(201).json({
            success: true,
            message: 'Crypto fee created successfully',
            data: savedFee
        });
    }
    catch (error) {
        console.error('Error creating crypto fee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create crypto fee',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.createCryptoFee = createCryptoFee;
// Update crypto fee
const updateCryptoFee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { cryptocurrency, symbol, feePercentage, minimumFee, maximumFee, isActive } = req.body;
        const fee = yield CryptoFee_1.default.findById(id);
        if (!fee) {
            return res.status(404).json({
                success: false,
                message: 'Crypto fee not found'
            });
        }
        // Check for duplicate if changing cryptocurrency or symbol
        if (cryptocurrency !== fee.cryptocurrency || symbol !== fee.symbol) {
            const existingFee = yield CryptoFee_1.default.findOne({
                _id: { $ne: id },
                $or: [
                    { cryptocurrency },
                    { symbol: symbol === null || symbol === void 0 ? void 0 : symbol.toUpperCase() }
                ]
            });
            if (existingFee) {
                return res.status(409).json({
                    success: false,
                    message: 'Another crypto fee already exists for this cryptocurrency or symbol'
                });
            }
        }
        // Update fields
        if (cryptocurrency !== undefined)
            fee.cryptocurrency = cryptocurrency;
        if (symbol !== undefined)
            fee.symbol = symbol.toUpperCase();
        if (feePercentage !== undefined)
            fee.feePercentage = feePercentage;
        if (minimumFee !== undefined)
            fee.minimumFee = minimumFee;
        if (maximumFee !== undefined)
            fee.maximumFee = maximumFee;
        if (isActive !== undefined)
            fee.isActive = isActive;
        const updatedFee = yield fee.save();
        res.json({
            success: true,
            message: 'Crypto fee updated successfully',
            data: updatedFee
        });
    }
    catch (error) {
        console.error('Error updating crypto fee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update crypto fee',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.updateCryptoFee = updateCryptoFee;
// Delete crypto fee
const deleteCryptoFee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const fee = yield CryptoFee_1.default.findById(id);
        if (!fee) {
            return res.status(404).json({
                success: false,
                message: 'Crypto fee not found'
            });
        }
        yield CryptoFee_1.default.findByIdAndDelete(id);
        res.json({
            success: true,
            message: 'Crypto fee deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting crypto fee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete crypto fee',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.deleteCryptoFee = deleteCryptoFee;
// Toggle crypto fee status
const toggleCryptoFeeStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const fee = yield CryptoFee_1.default.findById(id);
        if (!fee) {
            return res.status(404).json({
                success: false,
                message: 'Crypto fee not found'
            });
        }
        fee.isActive = !fee.isActive;
        const updatedFee = yield fee.save();
        res.json({
            success: true,
            message: `Crypto fee ${updatedFee.isActive ? 'activated' : 'deactivated'} successfully`,
            data: updatedFee
        });
    }
    catch (error) {
        console.error('Error toggling crypto fee status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle crypto fee status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.toggleCryptoFeeStatus = toggleCryptoFeeStatus;
// Calculate fee for a given amount and cryptocurrency
const calculateFee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { symbol, amount } = req.params;
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount provided'
            });
        }
        const fee = yield CryptoFee_1.default.findOne({ symbol: symbol.toUpperCase(), isActive: true });
        if (!fee) {
            return res.status(404).json({
                success: false,
                message: 'Crypto fee not found for symbol'
            });
        }
        // Calculate percentage fee
        let calculatedFee = (numAmount * fee.feePercentage) / 100;
        // Apply minimum and maximum limits
        calculatedFee = Math.max(calculatedFee, fee.minimumFee);
        calculatedFee = Math.min(calculatedFee, fee.maximumFee);
        res.json({
            success: true,
            data: {
                cryptocurrency: fee.cryptocurrency,
                symbol: fee.symbol,
                amount: numAmount,
                feePercentage: fee.feePercentage,
                calculatedFee,
                minimumFee: fee.minimumFee,
                maximumFee: fee.maximumFee,
                netAmount: numAmount - calculatedFee
            }
        });
    }
    catch (error) {
        console.error('Error calculating fee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate fee',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.calculateFee = calculateFee;
