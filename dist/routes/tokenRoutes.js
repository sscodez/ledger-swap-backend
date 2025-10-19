"use strict";
/**
 * Token Management Routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tokenController_1 = require("../controllers/tokenController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public routes
router.get('/', tokenController_1.getAllTokens);
router.get('/search', tokenController_1.searchTokens);
router.get('/stats', tokenController_1.getTokenStats);
router.get('/chain/:chainKey', tokenController_1.getTokensByChain);
router.get('/:key', tokenController_1.getTokenByKey);
// Admin routes
router.post('/', authMiddleware_1.protect, authMiddleware_1.isAdmin, tokenController_1.createToken);
router.post('/bulk', authMiddleware_1.protect, authMiddleware_1.isAdmin, tokenController_1.bulkCreateTokens);
router.put('/:key', authMiddleware_1.protect, authMiddleware_1.isAdmin, tokenController_1.updateToken);
router.patch('/:key/status', authMiddleware_1.protect, authMiddleware_1.isAdmin, tokenController_1.toggleTokenStatus);
router.delete('/:key', authMiddleware_1.protect, authMiddleware_1.isAdmin, tokenController_1.deleteToken);
exports.default = router;
