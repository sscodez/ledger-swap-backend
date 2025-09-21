"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const exchangeController_1 = require("../controllers/exchangeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// POST /api/exchanges
// Creates a new exchange and returns { exchangeId, record }
router.post('/', authMiddleware_1.protect, exchangeController_1.createExchange);
router.get('/:exchangeId', authMiddleware_1.protect, exchangeController_1.getExchangeById);
router.put('/:exchangeId/status', authMiddleware_1.protect, exchangeController_1.updateExchangeStatus);
exports.default = router;
