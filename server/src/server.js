import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { initSocketServer } from './sockets/index.js';
import { initSignalScheduler } from './jobs/signalScheduler.js';
import { initHeartbeatMonitor } from './jobs/heartbeatMonitor.js';
import { seedAdmin } from '../seeds/adminSeed.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import signalRoutes from './routes/signal.routes.js';
import robotRoutes from './routes/robot.routes.js';
import stakingRoutes from './routes/staking.routes.js';
import mt5Routes from './routes/mt5.routes.js';

const app = express();
const httpServer = createServer(app);

// Trust reverse proxy (nginx) — required for correct IP detection behind proxy
app.set('trust proxy', 1);

// CORS origins — support production domain + local dev
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:8080',
].filter(Boolean);

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin proxy)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // In production behind reverse proxy, allow all
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(apiLimiter);

// Routes
app.use('/auth', authRoutes);
app.use('/signals', signalRoutes);
app.use('/robots', robotRoutes);
app.use('/staking', stakingRoutes);
app.use('/mt5', mt5Routes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// Start server
const start = async () => {
  await connectDatabase();
  await seedAdmin("ubora.ai@mailinator.com");
  initSocketServer(io);
  initSignalScheduler(io);
  initHeartbeatMonitor(io);

  httpServer.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`🚀 Ubora Trading Server running on port ${env.PORT}`);
    logger.info(`📡 Socket.io ready`);
    logger.info(`🌍 Environment: ${env.NODE_ENV}`);
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down...');
  httpServer.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down...');
  httpServer.close(() => process.exit(0));
});

process.on('SIGUSR2', () => {
  logger.info('SIGUSR2 received (nodemon restart). Shutting down...');
  httpServer.close(() => process.kill(process.pid, 'SIGUSR2'));
});

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
