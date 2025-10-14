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
const publishBlogsSimple = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, db_1.default)();
        console.log('Connected to database');
        // Find all draft blogs
        const draftBlogs = yield Blog_1.default.find({ status: 'draft' });
        console.log(`Found ${draftBlogs.length} draft blogs`);
        if (draftBlogs.length === 0) {
            console.log('No draft blogs found to publish');
            return;
        }
        // Publish all draft blogs
        const updateResult = yield Blog_1.default.updateMany({ status: 'draft' }, {
            status: 'published',
            publishedAt: new Date()
        });
        console.log(`✅ Published ${updateResult.modifiedCount} blogs`);
        // Verify the changes
        const publishedBlogs = yield Blog_1.default.countDocuments({ status: 'published' });
        const totalBlogs = yield Blog_1.default.countDocuments();
        console.log(`\n📊 Database Summary:`);
        console.log(`Total blogs: ${totalBlogs}`);
        console.log(`Published blogs: ${publishedBlogs}`);
        // List all published blogs
        const allPublishedBlogs = yield Blog_1.default.find({ status: 'published' }).select('title slug createdAt').lean();
        console.log(`\n📝 Published Blogs:`);
        allPublishedBlogs.forEach((blog, index) => {
            console.log(`${index + 1}. ${blog.title} - Slug: ${blog.slug}`);
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
    publishBlogsSimple();
}
exports.default = publishBlogsSimple;
