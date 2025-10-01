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
exports.getFeaturedBlogs = exports.getPopularTags = exports.getBlogCategories = exports.deleteBlog = exports.updateBlog = exports.createBlog = exports.getBlogById = exports.getBlogBySlug = exports.getAllBlogs = void 0;
const Blog_1 = __importDefault(require("../models/Blog"));
const mongoose_1 = __importDefault(require("mongoose"));
// Get all blogs with pagination and filtering
const getAllBlogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const category = req.query.category;
        const status = req.query.status || 'published';
        const search = req.query.search;
        const tag = req.query.tag;
        const skip = (page - 1) * limit;
        // Build query
        const query = {};
        if (status) {
            query.status = status;
        }
        if (category) {
            query.category = category;
        }
        if (tag) {
            query.tags = { $in: [tag] };
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } }
            ];
        }
        const blogs = yield Blog_1.default.find(query)
            .populate('author', 'name email profilePicture')
            .sort({ publishedAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const total = yield Blog_1.default.countDocuments(query);
        res.json({
            success: true,
            data: {
                blogs,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total,
                    limit
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blogs',
            error: error.message
        });
    }
});
exports.getAllBlogs = getAllBlogs;
// Get single blog by slug
const getBlogBySlug = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { slug } = req.params;
        const blog = yield Blog_1.default.findOne({ slug, status: 'published' })
            .populate('author', 'name email profilePicture')
            .lean();
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }
        // Increment views
        yield Blog_1.default.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });
        res.json({
            success: true,
            data: blog
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blog',
            error: error.message
        });
    }
});
exports.getBlogBySlug = getBlogBySlug;
// Get blog by ID (for admin)
const getBlogById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid blog ID'
            });
        }
        const blog = yield Blog_1.default.findById(id)
            .populate('author', 'name email profilePicture')
            .lean();
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }
        res.json({
            success: true,
            data: blog
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blog',
            error: error.message
        });
    }
});
exports.getBlogById = getBlogById;
// Create new blog (admin only)
const createBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, content, excerpt, featuredImage, tags, category, status, slug, metaTitle, metaDescription } = req.body;
        // Check if user is admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        // Check if slug already exists
        if (slug) {
            const existingBlog = yield Blog_1.default.findOne({ slug });
            if (existingBlog) {
                return res.status(400).json({
                    success: false,
                    message: 'Slug already exists'
                });
            }
        }
        const blog = new Blog_1.default({
            title,
            content,
            excerpt,
            author: req.user._id,
            featuredImage,
            tags: tags || [],
            category: category || 'general',
            status: status || 'draft',
            slug,
            metaTitle,
            metaDescription
        });
        yield blog.save();
        const populatedBlog = yield Blog_1.default.findById(blog._id)
            .populate('author', 'name email profilePicture')
            .lean();
        res.status(201).json({
            success: true,
            message: 'Blog created successfully',
            data: populatedBlog
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Slug already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error creating blog',
            error: error.message
        });
    }
});
exports.createBlog = createBlog;
// Update blog (admin only)
const updateBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updateData = req.body;
        // Check if user is admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid blog ID'
            });
        }
        // Check if slug already exists (if updating slug)
        if (updateData.slug) {
            const existingBlog = yield Blog_1.default.findOne({ slug: updateData.slug, _id: { $ne: id } });
            if (existingBlog) {
                return res.status(400).json({
                    success: false,
                    message: 'Slug already exists'
                });
            }
        }
        const blog = yield Blog_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('author', 'name email profilePicture');
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }
        res.json({
            success: true,
            message: 'Blog updated successfully',
            data: blog
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Slug already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error updating blog',
            error: error.message
        });
    }
});
exports.updateBlog = updateBlog;
// Delete blog (admin only)
const deleteBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if user is admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid blog ID'
            });
        }
        const blog = yield Blog_1.default.findByIdAndDelete(id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }
        res.json({
            success: true,
            message: 'Blog deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting blog',
            error: error.message
        });
    }
});
exports.deleteBlog = deleteBlog;
// Get blog categories
const getBlogCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = [
            'cryptocurrency',
            'blockchain',
            'trading',
            'defi',
            'news',
            'tutorial',
            'market-analysis',
            'security',
            'general'
        ];
        res.json({
            success: true,
            data: categories
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
});
exports.getBlogCategories = getBlogCategories;
// Get popular tags
const getPopularTags = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tags = yield Blog_1.default.aggregate([
            { $match: { status: 'published' } },
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
            { $project: { tag: '$_id', count: 1, _id: 0 } }
        ]);
        res.json({
            success: true,
            data: tags
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching tags',
            error: error.message
        });
    }
});
exports.getPopularTags = getPopularTags;
// Get featured blogs
const getFeaturedBlogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const blogs = yield Blog_1.default.find({
            status: 'published',
            featuredImage: { $exists: true, $ne: null }
        })
            .populate('author', 'name email profilePicture')
            .sort({ views: -1, publishedAt: -1 })
            .limit(limit)
            .lean();
        res.json({
            success: true,
            data: blogs
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching featured blogs',
            error: error.message
        });
    }
});
exports.getFeaturedBlogs = getFeaturedBlogs;
