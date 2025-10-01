"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const exchangeController_1 = require("../controllers/exchangeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Create optional auth middleware for exchanges
const optionalAuth = (req, res, next) => {
    // Try to authenticate, but don't fail if no token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        return (0, authMiddleware_1.protect)(req, res, next);
    }
    else {
        // No authentication provided, continue without user
        next();
    }
};
// POST /api/exchanges
// Creates a new exchange and returns { exchangeId, record }
// Now supports both authenticated and anonymous users
router.post('/', optionalAuth, exchangeController_1.createExchange);
router.get('/:exchangeId', exchangeController_1.getExchangeById); // Remove auth requirement for viewing exchanges
router.put('/:exchangeId/status', authMiddleware_1.protect, exchangeController_1.updateExchangeStatus); // Keep auth for status updates
exports.default = router;
