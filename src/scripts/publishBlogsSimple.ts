import mongoose from 'mongoose';
import Blog from '../models/Blog';
import connectDB from '../config/db';
import dotenv from 'dotenv';

dotenv.config();

const publishBlogsSimple = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Find all draft blogs
    const draftBlogs = await Blog.find({ status: 'draft' });
    console.log(`Found ${draftBlogs.length} draft blogs`);

    if (draftBlogs.length === 0) {
      console.log('No draft blogs found to publish');
      return;
    }

    // Publish all draft blogs
    const updateResult = await Blog.updateMany(
      { status: 'draft' },
      { 
        status: 'published',
        publishedAt: new Date()
      }
    );

    console.log(`✅ Published ${updateResult.modifiedCount} blogs`);

    // Verify the changes
    const publishedBlogs = await Blog.countDocuments({ status: 'published' });
    const totalBlogs = await Blog.countDocuments();
    
    console.log(`\n📊 Database Summary:`);
    console.log(`Total blogs: ${totalBlogs}`);
    console.log(`Published blogs: ${publishedBlogs}`);
    
    // List all published blogs
    const allPublishedBlogs = await Blog.find({ status: 'published' }).select('title slug createdAt').lean();
    console.log(`\n📝 Published Blogs:`);
    allPublishedBlogs.forEach((blog, index) => {
      console.log(`${index + 1}. ${blog.title} - Slug: ${blog.slug}`);
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
  publishBlogsSimple();
}

export default publishBlogsSimple;
