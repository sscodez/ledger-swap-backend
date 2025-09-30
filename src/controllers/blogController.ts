import { Request, Response } from 'express';
import Blog, { IBlog } from '../models/Blog';
import User, { IUser } from '../models/User';
import mongoose from 'mongoose';

// Get all blogs with pagination and filtering
export const getAllBlogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;
    const status = req.query.status as string || 'published';
    const search = req.query.search as string;
    const tag = req.query.tag as string;

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    
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

    const blogs = await Blog.find(query)
      .populate('author', 'name email profilePicture')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Blog.countDocuments(query);

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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: error.message
    });
  }
};

// Get single blog by slug
export const getBlogBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({ slug, status: 'published' })
      .populate('author', 'name email profilePicture')
      .lean();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Increment views
    await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });

    res.json({
      success: true,
      data: blog
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: error.message
    });
  }
};

// Get blog by ID (for admin)
export const getBlogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blog ID'
      });
    }

    const blog = await Blog.findById(id)
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: error.message
    });
  }
};

// Create new blog (admin only)
export const createBlog = async (req: Request, res: Response) => {
  try {
    const {
      title,
      content,
      excerpt,
      featuredImage,
      tags,
      category,
      status,
      slug,
      metaTitle,
      metaDescription
    } = req.body;

    // Check if user is admin
    if (!req.user || (req.user as IUser).role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Check if slug already exists
    if (slug) {
      const existingBlog = await Blog.findOne({ slug });
      if (existingBlog) {
        return res.status(400).json({
          success: false,
          message: 'Slug already exists'
        });
      }
    }

    const blog = new Blog({
      title,
      content,
      excerpt,
      author: (req.user as IUser)._id,
      featuredImage,
      tags: tags || [],
      category: category || 'general',
      status: status || 'draft',
      slug,
      metaTitle,
      metaDescription
    });

    await blog.save();

    const populatedBlog = await Blog.findById(blog._id)
      .populate('author', 'name email profilePicture')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: populatedBlog
    });
  } catch (error: any) {
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
};

// Update blog (admin only)
export const updateBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if user is admin
    if (!req.user || (req.user as IUser).role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blog ID'
      });
    }

    // Check if slug already exists (if updating slug)
    if (updateData.slug) {
      const existingBlog = await Blog.findOne({ slug: updateData.slug, _id: { $ne: id } });
      if (existingBlog) {
        return res.status(400).json({
          success: false,
          message: 'Slug already exists'
        });
      }
    }

    const blog = await Blog.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name email profilePicture');

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
  } catch (error: any) {
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
};

// Delete blog (admin only)
export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    if (!req.user || (req.user as IUser).role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blog ID'
      });
    }

    const blog = await Blog.findByIdAndDelete(id);

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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting blog',
      error: error.message
    });
  }
};

// Get blog categories
export const getBlogCategories = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// Get popular tags
export const getPopularTags = async (req: Request, res: Response) => {
  try {
    const tags = await Blog.aggregate([
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tags',
      error: error.message
    });
  }
};

// Get featured blogs
export const getFeaturedBlogs = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    const blogs = await Blog.find({ 
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching featured blogs',
      error: error.message
    });
  }
};
