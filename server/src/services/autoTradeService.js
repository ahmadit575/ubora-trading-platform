import { Robot } from '../models/index.js';
import { executePocketOptionTrade } from './pocketOptionService.js';
import { logger } from '../utils/logger.js';

/**
 * Check if any running robots match the new signal and route it for execution.
 * @param {Object} signal - Mongoose Signal document
 * @param {Object} io - Socket.io server instance for live updates
 */
export const processNewSignal = async (signal, io) => {
  try {
    logger.info(`📡 [AutoTrade] Processing new signal: ${signal.pair} ${signal.direction} (${signal.strategy}) on ${signal.platform}`);

    // Find all active/running robots matching the platform of the signal
    const runningRobots = await Robot.find({
      status: 'running',
      platform: signal.platform,
    });

    if (runningRobots.length === 0) {
      logger.info(`ℹ️ [AutoTrade] No running robots found for platform: ${signal.platform}`);
      return;
    }

    for (const robot of runningRobots) {
      // 1. Check if strategy matches
      const strategyMatches = robot.strategy === signal.strategy;
      if (!strategyMatches) {
        logger.debug(`[AutoTrade] Robot '${robot.name}' strategy mismatch: ${robot.strategy} vs ${signal.strategy}`);
        continue;
      }

      // 2. Check if the trading pair is in the robot's configured pairs
      const signalPairNormalized = signal.pair.toUpperCase();
      const pairMatches = robot.config?.pairs?.some(
        (p) => p.toUpperCase() === signalPairNormalized
      );

      if (!pairMatches) {
        logger.debug(`[AutoTrade] Robot '${robot.name}' is not configured to trade pair: ${signal.pair}`);
        continue;
      }

      // Match found! Trigger the platform-specific execution
      logger.info(`🎯 [AutoTrade] Match found! Routing signal to active Robot: '${robot.name}'`);
      
      if (robot.platform === 'pocket_option') {
        // Run in background asynchronously so we do not block the thread
        executePocketOptionTrade(robot, signal, io).catch((err) => {
          logger.error(`❌ [AutoTrade] Error during Pocket Option trade for robot ${robot.name}:`, err);
        });
      } else if (robot.platform === 'mt5') {
        // We will bridge MT5 in Phase 4, but let's log the bridge route trigger
        logger.info(`[AutoTrade] Routing to MT5 bridge for Robot: '${robot.name}'`);
      }
    }
  } catch (error) {
    logger.error('❌ [AutoTrade] Error in processNewSignal routing:', error);
  }
};
