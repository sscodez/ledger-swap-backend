import mongoose from 'mongoose';
import Blog from '../models/Blog';
import User from '../models/User';
import connectDB from '../config/db';
import dotenv from 'dotenv';

dotenv.config();

const publishExistingBlogs = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Find all draft blogs
    const draftBlogs = await Blog.find({ status: 'draft' }).populate('author', 'name email');
    console.log(`Found ${draftBlogs.length} draft blogs`);

    if (draftBlogs.length === 0) {
      console.log('No draft blogs found to publish');
      return;
    }

    // Publish all draft blogs
    for (const blog of draftBlogs) {
      blog.status = 'published';
      blog.publishedAt = new Date();
      
      // Ensure the blog has proper content
      if (!blog.excerpt || blog.excerpt.trim() === '') {
        blog.excerpt = blog.content.substring(0, 200) + '...';
      }
      
      // Ensure the blog has a proper slug
      if (!blog.slug || blog.slug.trim() === '') {
        blog.slug = blog.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      }

      await blog.save();
      console.log(`✅ Published blog: ${blog.title}`);
    }

    // Verify the changes
    const publishedBlogs = await Blog.countDocuments({ status: 'published' });
    const totalBlogs = await Blog.countDocuments();
    
    console.log(`\n📊 Database Summary:`);
    console.log(`Total blogs: ${totalBlogs}`);
    console.log(`Published blogs: ${publishedBlogs}`);
    
    // List all published blogs
    const allPublishedBlogs = await Blog.find({ status: 'published' }).populate('author', 'name email').lean();
    console.log(`\n📝 Published Blogs:`);
    allPublishedBlogs.forEach((blog, index) => {
      const authorName = blog.author && typeof blog.author === 'object' && 'name' in blog.author 
        ? (blog.author as any).name 
        : 'Unknown';
      console.log(`${index + 1}. ${blog.title} - Author: ${authorName} - Slug: ${blog.slug}`);
    });
    
  } catch (error) {
    console.error('Error publishing blogs:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  publishExistingBlogs();
}

export default publishExistingBlogs;
