"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const blogController_1 = require("../controllers/blogController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public routes (with optional auth for admin features)
router.get('/', authMiddleware_1.optionalAuth, blogController_1.getAllBlogs);
router.get('/categories', blogController_1.getBlogCategories);
router.get('/tags', blogController_1.getPopularTags);
router.get('/featured', blogController_1.getFeaturedBlogs);
router.get('/slug/:slug', blogController_1.getBlogBySlug);
// Protected routes (admin only)
router.get('/:id', authMiddleware_1.optionalAuth, blogController_1.getBlogById);
router.post('/', authMiddleware_1.protect, blogController_1.createBlog);
router.put('/:id', authMiddleware_1.protect, blogController_1.updateBlog);
router.delete('/:id', authMiddleware_1.protect, blogController_1.deleteBlog);
exports.default = router;
