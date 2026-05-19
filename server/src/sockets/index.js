import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const initSocketServer = (io) => {
  // JWT authentication middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      logger.warn(`Socket auth rejected: no token provided (origin: ${socket.handshake.headers?.origin})`);
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      logger.warn(`Socket auth rejected: ${err.message} (origin: ${socket.handshake.headers?.origin})`);
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.user.userId} (${socket.id})`);

    // Join role-based rooms
    socket.join(`role:${socket.user.role}`);
    socket.join(`user:${socket.user.userId}`);

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('✅ Socket.io server initialized with JWT auth');
};
