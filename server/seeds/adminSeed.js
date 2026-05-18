import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../src/models/index.js';
import { env } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';

export const seedAdmin = async () => {
  try {
    const existing = await User.findOne({ email: env.ADMIN_EMAIL });
    if (existing) {
      logger.info(`Admin user already exists: ${env.ADMIN_EMAIL}`);
      return;
    }

    const randomPassword = "Ubora@42435"

    const admin = new User({
      name: 'Ubora Admin',
      email: env.ADMIN_EMAIL,
      passwordHash: randomPassword,
      role: 'admin',
    });

    await admin.save();

    logger.info('╔══════════════════════════════════════════════════╗');
    logger.info('║          ADMIN ACCOUNT CREATED                  ║');
    logger.info(`║  Email:    ${env.ADMIN_EMAIL}   ║`);
    logger.info(`║  Password: ${randomPassword.padEnd(37)}║`);
    logger.info('║  ⚠️  Change this password immediately!          ║');
    logger.info('╚══════════════════════════════════════════════════╝');
  } catch (error) {
    logger.error('Admin seed error:', error.message);
  }
};
