import mongoose, { Document, Schema } from 'mongoose';

export interface IBlog extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  content: string;
  excerpt: string;
  author: mongoose.Types.ObjectId;
  featuredImage?: string;
  tags: string[];
  category: string;
  status: 'draft' | 'published' | 'archived';
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  readTime?: number;
  views: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    required: true,
    maxlength: 500
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  featuredImage: {
    type: String,
    default: null
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    required: true,
    enum: ['cryptocurrency', 'blockchain', 'trading', 'defi', 'news', 'tutorial', 'market-analysis', 'security', 'general'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  metaTitle: {
    type: String,
    maxlength: 60
  },
  metaDescription: {
    type: String,
    maxlength: 160
  },
  readTime: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Create indexes for better performance
blogSchema.index({ slug: 1 });
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ author: 1 });

// Pre-save middleware to generate slug and calculate read time
blogSchema.pre<IBlog>('save', function(next) {
  // Generate slug from title if not provided
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Calculate read time (average 200 words per minute)
  if (this.content) {
    const wordCount = this.content.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / 200);
  }

  // Set publishedAt when status changes to published
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

const Blog = mongoose.model<IBlog>('Blog', blogSchema);

export default Blog;
