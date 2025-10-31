import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Debug mongoose version and setup
console.log('Mongoose version:', mongoose.version);
console.log('Node.js version:', process.version);

// Set mongoose options globally to avoid constructor issues
mongoose.set('strictQuery', false);

async function tryConnect(mongoURI: string) {
  console.log('Attempting to connect to MongoDB...');
  console.log('URI (masked):', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  
  // Disconnect any existing connection first
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  // Use the most basic connection possible to avoid constructor issues
  const connection = await mongoose.connect(mongoURI);
  return connection;
}

const connectDB = async () => {
  if (process.env.SKIP_DB === '1') {
    console.warn('SKIP_DB=1 detected. Starting server without DB connection.');
    return;
  }
  // Prefer environment variable; do not hardcode credentials
  const mongoURI = process.env.MONGO_URI || '';
  if (!mongoURI || mongoURI.trim() === '') {
    console.warn('MONGO_URI not set. Starting server without DB connection. Some routes will be limited.');
    return; // Do not block server startup
  }

  try {
    await tryConnect(mongoURI);
    console.log('MongoDB connected');
  } catch (error: any) {
    const code = error?.code || error?.name;
    const msg = error?.message || String(error);
    console.error(`MongoDB connection failed (${code}): ${msg}`);
    if (msg?.includes('queryTxt') || msg?.includes('ETIMEOUT')) {
      console.error(
        'Hint: If you are using mongodb+srv, ensure network allows DNS (TXT/SRV) lookups and your Atlas IP Access List includes your IP.\n' +
        '      Alternatively, use a standard mongodb:// connection string with hosts/replicas instead of SRV.'
      );
    }
    console.warn('Continuing to run without DB. API routes that require DB may fail until DB is reachable.');
    // Do not throw or exit; allow server to start for non-DB routes
  }
};

export default connectDB;
