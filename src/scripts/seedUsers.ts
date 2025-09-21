import dotenv from 'dotenv';
import connectDB from '../config/db';
import User from '../models/User';
import Overview from '../models/Overview';

(async () => {
  dotenv.config();

  const users = [
    { name: 'Alice', email: 'alice@example.com', password: 'User@12345', role: 'user' as const },
    { name: 'Bob', email: 'bob@example.com', password: 'User@12345', role: 'user' as const },
    { name: 'Carol', email: 'carol@example.com', password: 'User@12345', role: 'user' as const },
  ];

  try {
    await connectDB();

    for (const u of users) {
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        console.log(`User already exists: ${u.email}`);
        continue;
      }

      const created = await User.create(u);
      await Overview.create({ user: created._id });
      console.log(`Seeded user: ${u.email} / ${u.password}`);
    }

    console.log('User seeding completed.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed users:', err);
    process.exit(1);
  }
})();
