import dotenv from 'dotenv';
import connectDB from '../config/db';
import User from '../models/User';

(async () => {
  dotenv.config();

  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@ledgerswap.dev';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';
  const name = process.env.DEFAULT_ADMIN_NAME || 'Admin';

  try {
    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`Admin already exists: ${email}`);
      process.exit(0);
    }

    await User.create({ name, email, password, role: 'admin' });
    console.log('Admin user created successfully');
    console.log('===============================');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('===============================');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed admin:', err);
    process.exit(1);
  }
})();
