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
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/', getAllBlogs);
router.get('/categories', getBlogCategories);
router.get('/tags', getPopularTags);
router.get('/featured', getFeaturedBlogs);
router.get('/slug/:slug', getBlogBySlug);

// Protected routes (admin only)
router.get('/:id', protect, getBlogById);
router.post('/', protect, createBlog);
router.put('/:id', protect, updateBlog);
router.delete('/:id', protect, deleteBlog);

export default router;
