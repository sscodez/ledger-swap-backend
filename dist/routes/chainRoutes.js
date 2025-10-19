"use strict";
/**
 * Chain Management Routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chainController_1 = require("../controllers/chainController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public routes
router.get('/', chainController_1.getAllChains);
router.get('/stats', chainController_1.getChainStats);
router.get('/:key', chainController_1.getChainByKey);
// Admin routes
router.post('/', authMiddleware_1.protect, authMiddleware_1.isAdmin, chainController_1.createChain);
router.put('/:key', authMiddleware_1.protect, authMiddleware_1.isAdmin, chainController_1.updateChain);
router.patch('/:key/status', authMiddleware_1.protect, authMiddleware_1.isAdmin, chainController_1.toggleChainStatus);
router.delete('/:key', authMiddleware_1.protect, authMiddleware_1.isAdmin, chainController_1.deleteChain);
exports.default = router;
