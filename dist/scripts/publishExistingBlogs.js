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
const mongoose_1 = __importDefault(require("mongoose"));
const Blog_1 = __importDefault(require("../models/Blog"));
const db_1 = __importDefault(require("../config/db"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const publishExistingBlogs = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, db_1.default)();
        console.log('Connected to database');
        // Find all draft blogs
        const draftBlogs = yield Blog_1.default.find({ status: 'draft' }).populate('author', 'name email');
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
            yield blog.save();
            console.log(`✅ Published blog: ${blog.title}`);
        }
        // Verify the changes
        const publishedBlogs = yield Blog_1.default.countDocuments({ status: 'published' });
        const totalBlogs = yield Blog_1.default.countDocuments();
        console.log(`\n📊 Database Summary:`);
        console.log(`Total blogs: ${totalBlogs}`);
        console.log(`Published blogs: ${publishedBlogs}`);
        // List all published blogs
        const allPublishedBlogs = yield Blog_1.default.find({ status: 'published' }).populate('author', 'name email').lean();
        console.log(`\n📝 Published Blogs:`);
        allPublishedBlogs.forEach((blog, index) => {
            const authorName = blog.author && typeof blog.author === 'object' && 'name' in blog.author
                ? blog.author.name
                : 'Unknown';
            console.log(`${index + 1}. ${blog.title} - Author: ${authorName} - Slug: ${blog.slug}`);
        });
    }
    catch (error) {
        console.error('Error publishing blogs:', error);
    }
    finally {
        yield mongoose_1.default.connection.close();
        console.log('Database connection closed');
    }
});
// Run the script
if (require.main === module) {
    publishExistingBlogs();
}
exports.default = publishExistingBlogs;
