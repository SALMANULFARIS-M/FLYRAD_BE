import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection settings
const MAX_RETRIES = 3; // Maximum number of connection retries
const RETRY_DELAY = 5000; // Delay between retries (5 seconds)

const connectDB = async (retryCount = 0) => {
  // Validate environment variable
  if (!process.env.MONGODBSERVER) {
    console.error('❌ MONGODBSERVER environment variable is not defined');
    process.exit(1);
  }

  try {
    // Connect to MongoDB (without deprecated options)
    await mongoose.connect(process.env.MONGODBSERVER);

    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error(`❌ MongoDB connection error (Attempt ${retryCount + 1}):`, error.message);

    // Retry connection if max retries not reached
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying connection in ${RETRY_DELAY / 1000} seconds...`);
      setTimeout(() => connectDB(retryCount + 1), RETRY_DELAY);
    } else {
      console.error('❌ Maximum retries reached. Exiting...');
      process.exit(1);
    }
  }
};

// MongoDB event listeners
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('disconnected', () => {
  console.log('❌ MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error);
});

export default connectDB;