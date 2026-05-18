import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Fix DNS resolution issues on Windows for MongoDB Atlas SRV
dns.setDefaultResultOrder('ipv4first');

export const connectDatabase = async () => {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await mongoose.connect(env.MONGO_URI, {
        family: 4,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      logger.info('✅ MongoDB connected successfully');
      
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting reconnection...');
      });
      return;
    } catch (error) {
      retries++;
      logger.warn(`MongoDB connection attempt ${retries}/${maxRetries} failed: ${error.message}`);
      if (retries < maxRetries) {
        logger.info(`Retrying in 3 seconds...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  logger.error('❌ MongoDB connection failed after all retries. Server will start without DB.');
  logger.error('⚠️  API routes requiring database will return errors.');
};
