import mongoose from 'mongoose';
import config from '../config.cjs';

const { DB_CONFIG } = config;

let isConnected = false;


export const connectDB = async () => {
  try {
    if (isConnected) {
      console.log('✅ MongoDB is already connected');
      return;
      }
      console.log("Mono", DB_CONFIG.MONGODB_URI)

    const conn = await mongoose.connect(DB_CONFIG.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      isConnected = true;
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('📴 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};


export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    isConnected = false;
    console.log('📴 MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error.message);
  }
};

export const getConnectionStatus = () => {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name
  };
};


export const isDBReady = () => {
  return mongoose.connection.readyState === 1;
};
