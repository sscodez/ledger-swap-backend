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
  const mongoURI = 'mongodb+srv://ssameershah1200:fsuheocdNSHmLZjJ@cluster0.klfmnwd.mongodb.net/ledgerswap';
  if (!mongoURI || mongoURI.trim() === '') {
    console.error('MONGO_URI not found or empty in .env file');
    console.error('Please set MONGO_URI in your .env file to a valid MongoDB connection string');
    console.error('Example: MONGO_URI=mongodb://localhost:27017/ledgerswap');
    console.error('Or for MongoDB Atlas: MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ledgerswap');
    process.exit(1);
  }

  const maxRetries = 5;
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt += 1;
    try {
      await tryConnect(mongoURI);
      console.log('MongoDB connected');
      return;
    } catch (error: any) {
      const code = error?.code || error?.name;
      const msg = error?.message || String(error);
      console.error(`MongoDB connection attempt ${attempt} failed (${code}): ${msg}`);

      // Common guidance for SRV/DNS timeouts
      if (msg?.includes('queryTxt') || msg?.includes('ETIMEOUT')) {
        console.error(
          'Hint: If you are using mongodb+srv, ensure network allows DNS (TXT/SRV) lookups and your Atlas IP Access List includes your IP.\n' +
          '      Alternatively, use a standard mongodb:// connection string with hosts/replicas instead of SRV.'
        );
      }

      if (attempt >= maxRetries) {
        console.error('Exceeded max retries. Exiting.');
        process.exit(1);
      }

      // Backoff before next attempt
      const backoffMs = Math.min(15000, 1000 * attempt);
      await new Promise((res) => setTimeout(res, backoffMs));
    }
  }
};

export default connectDB;
