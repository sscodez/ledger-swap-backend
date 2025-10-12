"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cryptoFeeController_1 = require("../controllers/cryptoFeeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public routes (for fee calculation)
router.get('/calculate/:symbol/:amount', cryptoFeeController_1.calculateFee);
router.get('/symbol/:symbol', cryptoFeeController_1.getCryptoFeeBySymbol);
// Admin-only routes
router.use(authMiddleware_1.protect); // Require authentication for all routes below
router.use(authMiddleware_1.isAdmin); // Require admin role for all routes below
// CRUD operations
router.get('/', cryptoFeeController_1.getAllCryptoFees);
router.get('/:id', cryptoFeeController_1.getCryptoFeeById);
router.post('/', cryptoFeeController_1.createCryptoFee);
router.put('/:id', cryptoFeeController_1.updateCryptoFee);
router.delete('/:id', cryptoFeeController_1.deleteCryptoFee);
router.patch('/:id/toggle', cryptoFeeController_1.toggleCryptoFeeStatus);
exports.default = router;
