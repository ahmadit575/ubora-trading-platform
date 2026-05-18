import cron from 'node-cron';
import { generateSignalFromAI } from '../services/signalService.js';
import { logger } from '../utils/logger.js';
import { processNewSignal } from '../services/autoTradeService.js';

// Trading pairs for each market
const CRYPTO_PAIRS = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'];
const FOREX_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'];

// Market session check (GMT hours)
const isMarketActive = () => {
  const now = new Date();
  const hour = now.getUTCHours();
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false; // Weekend
  return hour >= 7 && hour < 21; // London open to NY close
};

const getCurrentSession = () => {
  const hour = new Date().getUTCHours();
  const sessions = [];
  if (hour >= 7 && hour < 16) sessions.push('london');
  if (hour >= 12 && hour < 21) sessions.push('new_york');
  if (hour >= 12 && hour < 16) sessions.push('overlap');
  return sessions;
};

export const initSignalScheduler = (io) => {
  // Scalping: every 1 minute for testing
  cron.schedule('* * * * *', async () => {
    // if (!isMarketActive()) return; // Temporarily disabled for weekend testing
    logger.info(`[Scheduler] Scalping scan - Sessions: ${getCurrentSession().join(', ')}`);
    const allPairs = [...CRYPTO_PAIRS, ...FOREX_PAIRS];
    for (const pair of allPairs) {
      try {
        const signal = await generateSignalFromAI(pair, 'scalping');
        if (signal && io) {
          io.emit('signal:new', signal);
          processNewSignal(signal, io);
        }
      } catch (e) {
        logger.error(`Scalping scheduler error for ${pair}:`, e.message);
      }
    }
  }, { timezone: 'UTC' });

  // Daily signal: London open (07:05 GMT) weekdays
  cron.schedule('5 7 * * 1-5', async () => {
    logger.info('[Scheduler] Daily London open signals');
    for (const pair of [...CRYPTO_PAIRS, ...FOREX_PAIRS]) {
      try {
        const signal = await generateSignalFromAI(pair, 'daily');
        if (signal && io) {
          io.emit('signal:new', signal);
          processNewSignal(signal, io);
        }
      } catch (e) {
        logger.error(`Daily London error for ${pair}:`, e.message);
      }
    }
  }, { timezone: 'UTC' });

  // Daily signal: NY open (12:05 GMT) weekdays
  cron.schedule('5 12 * * 1-5', async () => {
    logger.info('[Scheduler] Daily NY open signals');
    for (const pair of [...CRYPTO_PAIRS, ...FOREX_PAIRS]) {
      try {
        const signal = await generateSignalFromAI(pair, 'daily');
        if (signal && io) {
          io.emit('signal:new', signal);
          processNewSignal(signal, io);
        }
      } catch (e) {
        logger.error(`Daily NY error for ${pair}:`, e.message);
      }
    }
  }, { timezone: 'UTC' });

  logger.info('✅ Signal scheduler initialized (scalping: 5min, daily: London 07:05/NY 12:05 GMT)');
};
