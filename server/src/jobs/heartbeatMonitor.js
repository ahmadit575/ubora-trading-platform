import cron from 'node-cron';
import { Robot } from '../models/index.js';
import { logger } from '../utils/logger.js';

export const initHeartbeatMonitor = (io) => {
  // Check every 30 seconds for offline robots
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const offlineRobots = await Robot.find({
        status: 'running',
        platform: 'mt5', // Only MT5 robots require client connection heartbeats
        lastHeartbeat: { $lt: twoMinutesAgo },
      });

      for (const robot of offlineRobots) {
        robot.status = 'offline';
        await robot.save();
        
        if (io) {
          io.emit('robot:alert', {
            robotId: robot._id,
            name: robot.name,
            message: `Robot "${robot.name}" is offline (no heartbeat for 2+ minutes)`,
            timestamp: new Date().toISOString(),
          });
        }
        
        logger.warn(`Robot offline: ${robot.name} (last heartbeat: ${robot.lastHeartbeat})`);
      }
    } catch (error) {
      logger.error('Heartbeat monitor error:', error.message);
    }
  });

  logger.info('✅ Heartbeat monitor initialized (checking every 30s)');
};
