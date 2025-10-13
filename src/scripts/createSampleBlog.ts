import mongoose from 'mongoose';
import Blog from '../models/Blog';
import User from '../models/User';
import connectDB from '../config/db';
import dotenv from 'dotenv';

dotenv.config();

const createSampleBlog = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Check if any blogs exist
    const existingBlogs = await Blog.countDocuments();
    console.log(`Found ${existingBlogs} existing blogs`);

    if (existingBlogs > 0) {
      console.log('Blogs already exist, listing them:');
      const blogs = await Blog.find().populate('author', 'name email').lean();
      blogs.forEach((blog, index) => {
        const authorName = blog.author && typeof blog.author === 'object' && 'name' in blog.author 
          ? (blog.author as any).name 
          : 'Unknown';
        console.log(`${index + 1}. ${blog.title} - Status: ${blog.status} - Author: ${authorName}`);
      });
      return;
    }

    // Find an admin user to be the author
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('No admin user found, creating one...');
      adminUser = new User({
        name: 'Admin User',
        email: 'admin@ledgerswap.io',
        password: 'hashedpassword123', // This should be properly hashed in production
        role: 'admin',
        isVerified: true
      });
      await adminUser.save();
      console.log('Admin user created');
    }

    // Create sample blog posts
    const sampleBlogs = [
      {
        title: 'Welcome to LedgerSwap Blog',
        content: `
          <h2>Welcome to the LedgerSwap Blog!</h2>
          <p>We're excited to share the latest updates, insights, and educational content about cryptocurrency trading and blockchain technology.</p>
          
          <h3>What You'll Find Here</h3>
          <ul>
            <li>Market analysis and trading insights</li>
            <li>Cryptocurrency news and updates</li>
            <li>Educational content for beginners</li>
            <li>Platform updates and new features</li>
          </ul>
          
          <p>Stay tuned for regular updates and don't forget to follow us for the latest in crypto trading!</p>
        `,
        excerpt: 'Welcome to the LedgerSwap blog! Discover the latest in cryptocurrency trading, market insights, and educational content.',
        author: adminUser._id,
        featuredImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop',
        tags: ['welcome', 'announcement', 'cryptocurrency'],
        category: 'news',
        status: 'published',
        slug: 'welcome-to-ledgerswap-blog',
        metaTitle: 'Welcome to LedgerSwap Blog - Cryptocurrency Trading Insights',
        metaDescription: 'Discover the latest cryptocurrency trading insights, market analysis, and educational content on the LedgerSwap blog.'
      },
      {
        title: 'Understanding Cryptocurrency Trading Basics',
        content: `
          <h2>Getting Started with Cryptocurrency Trading</h2>
          <p>Cryptocurrency trading can seem complex at first, but understanding the basics will set you up for success.</p>
          
          <h3>Key Concepts</h3>
          <p><strong>Market Orders vs Limit Orders:</strong> Market orders execute immediately at current prices, while limit orders wait for your specified price.</p>
          
          <p><strong>Volatility:</strong> Crypto markets are highly volatile, meaning prices can change rapidly. This creates both opportunities and risks.</p>
          
          <h3>Risk Management</h3>
          <ul>
            <li>Never invest more than you can afford to lose</li>
            <li>Diversify your portfolio across different cryptocurrencies</li>
            <li>Set stop-loss orders to limit potential losses</li>
            <li>Do your own research (DYOR) before making trades</li>
          </ul>
          
          <p>Remember, trading cryptocurrencies involves significant risk, and past performance doesn't guarantee future results.</p>
        `,
        excerpt: 'Learn the fundamentals of cryptocurrency trading, including key concepts, risk management strategies, and best practices for beginners.',
        author: adminUser._id,
        featuredImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=400&fit=crop',
        tags: ['trading', 'tutorial', 'beginners', 'education'],
        category: 'tutorial',
        status: 'published',
        slug: 'cryptocurrency-trading-basics',
        metaTitle: 'Cryptocurrency Trading Basics - Complete Beginner Guide',
        metaDescription: 'Master cryptocurrency trading basics with our comprehensive guide covering market orders, risk management, and essential strategies.'
      },
      {
        title: 'The Future of Decentralized Finance (DeFi)',
        content: `
          <h2>Exploring the DeFi Revolution</h2>
          <p>Decentralized Finance (DeFi) is transforming the traditional financial landscape by removing intermediaries and enabling peer-to-peer financial services.</p>
          
          <h3>What is DeFi?</h3>
          <p>DeFi refers to financial services built on blockchain technology, particularly Ethereum, that operate without traditional financial intermediaries like banks or brokers.</p>
          
          <h3>Key DeFi Applications</h3>
          <ul>
            <li><strong>Decentralized Exchanges (DEXs):</strong> Trade cryptocurrencies directly with other users</li>
            <li><strong>Lending Protocols:</strong> Lend and borrow cryptocurrencies without banks</li>
            <li><strong>Yield Farming:</strong> Earn rewards by providing liquidity to protocols</li>
            <li><strong>Synthetic Assets:</strong> Create and trade derivatives of real-world assets</li>
          </ul>
          
          <h3>Benefits and Risks</h3>
          <p><strong>Benefits:</strong> 24/7 accessibility, global reach, transparency, and potentially higher yields.</p>
          <p><strong>Risks:</strong> Smart contract vulnerabilities, regulatory uncertainty, and high volatility.</p>
          
          <p>As DeFi continues to evolve, it's important to understand both the opportunities and risks involved.</p>
        `,
        excerpt: 'Explore the revolutionary world of Decentralized Finance (DeFi), its applications, benefits, and risks in the evolving crypto ecosystem.',
        author: adminUser._id,
        featuredImage: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=800&h=400&fit=crop',
        tags: ['defi', 'blockchain', 'finance', 'ethereum'],
        category: 'defi',
        status: 'published',
        slug: 'future-of-decentralized-finance',
        metaTitle: 'The Future of DeFi - Decentralized Finance Revolution',
        metaDescription: 'Discover how Decentralized Finance (DeFi) is revolutionizing traditional finance with blockchain technology and peer-to-peer services.'
      }
    ];

    console.log('Creating sample blog posts...');
    
    for (const blogData of sampleBlogs) {
      const blog = new Blog(blogData);
      await blog.save();
      console.log(`✅ Created blog: ${blog.title}`);
    }

    console.log(`\n🎉 Successfully created ${sampleBlogs.length} sample blog posts!`);
    
    // Verify creation
    const totalBlogs = await Blog.countDocuments();
    const publishedBlogs = await Blog.countDocuments({ status: 'published' });
    
    console.log(`\n📊 Database Summary:`);
    console.log(`Total blogs: ${totalBlogs}`);
    console.log(`Published blogs: ${publishedBlogs}`);
    
  } catch (error) {
    console.error('Error creating sample blogs:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  createSampleBlog();
}

export default createSampleBlog;
