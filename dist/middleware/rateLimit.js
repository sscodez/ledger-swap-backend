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
exports.loginRateLimit = loginRateLimit;
const PlatformSettings_1 = __importDefault(require("../models/PlatformSettings"));
// Simple in-memory rate limit store: key -> { count, resetAt }
// Keyed by combination of requester IP and provided email (if any)
const store = new Map();
function getClientKey(req) {
    var _a;
    const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
    // Email is inside body for signin endpoints
    const email = (((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || 'no-email').toString().toLowerCase();
    return `${ip}:${email}`;
}
function getLimit() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const settings = yield PlatformSettings_1.default.findOne({ key: 'default' }).lean();
            if (settings && typeof settings.loginRateLimitPerHour === 'number' && settings.loginRateLimitPerHour >= 0) {
                return settings.loginRateLimitPerHour;
            }
        }
        catch (e) {
            // ignore and fallback
        }
        return 5; // default
    });
}
function loginRateLimit(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const limit = yield getLimit();
        const key = getClientKey(req);
        const now = Date.now();
        const hour = 60 * 60 * 1000;
        const entry = store.get(key);
        if (!entry || entry.resetAt <= now) {
            // reset window
            store.set(key, { count: 1, resetAt: now + hour });
            return next();
        }
        if (entry.count >= limit) {
            const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
            res.setHeader('Retry-After', retryAfterSec.toString());
            return res.status(429).json({ message: 'Too many login attempts. Please try again later.', retryAfterSec, limit });
        }
        entry.count += 1;
        store.set(key, entry);
        return next();
    });
}
