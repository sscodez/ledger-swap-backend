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
exports.checkComprehensiveFlagged = exports.checkUserFlaggedAddresses = exports.checkFlaggedUser = exports.checkFlaggedAddress = void 0;
const Address_1 = __importDefault(require("../models/Address"));
const User_1 = __importDefault(require("../models/User"));
/**
 * Check if a wallet address is flagged
 * @param walletAddress - The wallet address to check
 * @returns Promise<{isFlagged: boolean, reason?: string, flaggedAt?: Date}>
 */
const checkFlaggedAddress = (walletAddress) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const flaggedAddress = yield Address_1.default.findOne({
            address: walletAddress.trim(),
            flagged: true
        });
        if (flaggedAddress) {
            return {
                isFlagged: true,
                reason: flaggedAddress.flaggedReason,
                flaggedAt: flaggedAddress.flaggedAt,
                type: 'address'
            };
        }
        return { isFlagged: false };
    }
    catch (error) {
        console.error('Error checking flagged address:', error);
        // In case of error, assume not flagged to avoid blocking legitimate users
        return { isFlagged: false };
    }
});
exports.checkFlaggedAddress = checkFlaggedAddress;
/**
 * Check if a user is flagged by their ID
 * @param userId - The user ID to check
 * @returns Promise<{isFlagged: boolean, reason?: string, flaggedAt?: Date}>
 */
const checkFlaggedUser = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.default.findById(userId);
        if (user && user.flagged) {
            return {
                isFlagged: true,
                reason: user.flaggedReason,
                flaggedAt: user.flaggedAt,
                type: 'user'
            };
        }
        return { isFlagged: false };
    }
    catch (error) {
        console.error('Error checking flagged user:', error);
        // In case of error, assume not flagged to avoid blocking legitimate users
        return { isFlagged: false };
    }
});
exports.checkFlaggedUser = checkFlaggedUser;
/**
 * Check if a user owns any flagged addresses
 * @param userId - The user ID to check
 * @returns Promise<{isFlagged: boolean, reason?: string, flaggedAt?: Date, addresses?: string[]}>
 */
const checkUserFlaggedAddresses = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const flaggedAddresses = yield Address_1.default.find({
            user: userId,
            flagged: true
        });
        if (flaggedAddresses.length > 0) {
            return {
                isFlagged: true,
                reason: `User has ${flaggedAddresses.length} flagged address(es)`,
                flaggedAt: flaggedAddresses[0].flaggedAt,
                addresses: flaggedAddresses.map(addr => addr.address),
                type: 'user_addresses'
            };
        }
        return { isFlagged: false };
    }
    catch (error) {
        console.error('Error checking user flagged addresses:', error);
        return { isFlagged: false };
    }
});
exports.checkUserFlaggedAddresses = checkUserFlaggedAddresses;
/**
 * Comprehensive check for flagged status (user, address, and user's addresses)
 * @param userId - The user ID
 * @param walletAddress - The wallet address (optional)
 * @returns Promise<{isFlagged: boolean, reason?: string, flaggedAt?: Date, type?: string}>
 */
const checkComprehensiveFlagged = (userId, walletAddress) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if user is flagged
        const userCheck = yield (0, exports.checkFlaggedUser)(userId);
        if (userCheck.isFlagged) {
            return userCheck;
        }
        // Check if user has any flagged addresses
        const userAddressCheck = yield (0, exports.checkUserFlaggedAddresses)(userId);
        if (userAddressCheck.isFlagged) {
            return userAddressCheck;
        }
        // Check if the specific wallet address is flagged (if provided)
        if (walletAddress) {
            const addressCheck = yield (0, exports.checkFlaggedAddress)(walletAddress);
            if (addressCheck.isFlagged) {
                return addressCheck;
            }
        }
        return { isFlagged: false };
    }
    catch (error) {
        console.error('Error in comprehensive flagged check:', error);
        return { isFlagged: false };
    }
});
exports.checkComprehensiveFlagged = checkComprehensiveFlagged;
