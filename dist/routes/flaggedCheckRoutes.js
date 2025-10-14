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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const flaggedCheck_1 = require("../utils/flaggedCheck");
const router = (0, express_1.Router)();
/**
 * POST /api/flagged-check/address
 * Check if a wallet address is flagged
 * Public endpoint - no authentication required
 */
router.post('/address', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { address } = req.body;
        if (!address || typeof address !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Address is required and must be a string'
            });
        }
        // Validate address format (basic check)
        const trimmedAddress = address.trim();
        if (trimmedAddress.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Invalid address format'
            });
        }
        // Check if address is flagged
        const flaggedResult = yield (0, flaggedCheck_1.checkFlaggedAddress)(trimmedAddress);
        return res.json({
            success: true,
            isFlagged: flaggedResult.isFlagged,
            reason: flaggedResult.reason,
            flaggedAt: flaggedResult.flaggedAt,
            type: flaggedResult.type
        });
    }
    catch (error) {
        console.error('Error checking flagged address:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}));
exports.default = router;
