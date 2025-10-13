import express from 'express';
import {
  getAllBlogs,
  getBlogBySlug,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogCategories,
  getPopularTags,
  getFeaturedBlogs
} from '../controllers/blogController';
import { protect, optionalAuth } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes (with optional auth for admin features)
router.get('/', optionalAuth, getAllBlogs);
router.get('/categories', getBlogCategories);
router.get('/tags', getPopularTags);
router.get('/featured', getFeaturedBlogs);
router.get('/slug/:slug', getBlogBySlug);

// Protected routes (admin only)
router.get('/:id', optionalAuth, getBlogById);
router.post('/', protect, createBlog);
router.put('/:id', protect, updateBlog);
router.delete('/:id', protect, deleteBlog);

export default router;
