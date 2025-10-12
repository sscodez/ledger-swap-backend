"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const tradingController_1 = require("../controllers/tradingController");
const router = (0, express_1.Router)();
// Public routes - no authentication required
router.get('/health', tradingController_1.getTradingHealth);
router.get('/quote', tradingController_1.getTradingQuote);
router.get('/supported-tokens', tradingController_1.getSupportedTokens);
router.get('/supported-pairs', tradingController_1.getSupportedTradingPairs);
router.get('/status/:exchangeId', tradingController_1.getSwapStatus);
router.post('/simulate', tradingController_1.simulateSwap);
// Protected routes - optional authentication (works for both anonymous and authenticated users)
router.post('/execute', authMiddleware_1.optionalAuth, tradingController_1.executeSwap);
exports.default = router;
