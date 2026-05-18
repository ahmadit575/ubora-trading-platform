import axios from 'axios';
import { Signal } from '../models/index.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const isCryptoPair = (pair) => {
  const crypto = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','DOT','AVAX','MATIC','LINK','LTC'];
  return pair.toUpperCase().split('/').some(p => crypto.includes(p));
};

export const fetchMarketData = async (pair, strategy) => {
  try {
    if (isCryptoPair(pair)) {
      const sym = pair.replace('/', '');
      const interval = strategy === 'scalping' ? '5m' : '1d';
      const res = await axios.get(`${env.BINANCE_BASE_URL}/api/v3/klines`, {
        params: { symbol: sym, interval, limit: 200 },
      });
      return res.data.map(c => ({
        timestamp: c[0], open: +c[1], high: +c[2], low: +c[3], close: +c[4], volume: +c[5],
      }));
    } else {
      const [from, to] = pair.split('/');
      const res = await axios.get('https://www.alphavantage.co/query', {
        params: { function: 'FX_INTRADAY', from_symbol: from, to_symbol: to, interval: '5min', apikey: env.ALPHA_VANTAGE_API_KEY, outputsize: 'compact' },
      });
      const ts = res.data['Time Series FX (5min)'];
      if (!ts) return null;
      return Object.entries(ts).map(([t, v]) => ({
        timestamp: new Date(t+' GMT').getTime(), open: +v['1. open'], high: +v['2. high'], low: +v['3. low'], close: +v['4. close'], volume: 0,
      })).reverse();
    }
  } catch (e) {
    logger.error(`Market data fetch error for ${pair}:`, e.message);
    return null;
  }
};

export const generateSignalFromAI = async (pair, strategy, platform = 'pocket_option') => {
  try {
    const marketData = await fetchMarketData(pair, strategy);
    if (!marketData || marketData.length < 50) {
      logger.warn(`Insufficient market data for ${pair}`);
      return null;
    }
    const response = await axios.post(`${env.AI_ENGINE_URL}/generate-signal`, { pair, strategy, marketData }, { timeout: 10000 });
    const d = response.data;
    if (d.confidenceScore < 60) {
      logger.info(`Signal discarded: ${pair} ${d.direction} - Confidence ${d.confidenceScore}%`);
      return null;
    }
    const signal = new Signal({
      pair: d.pair, direction: d.direction, strategy, entryZone: d.entryZone, stopLoss: d.stopLoss, takeProfit: d.takeProfit, confidenceScore: d.confidenceScore, platform, status: 'pending', gmtTimestamp: new Date(d.gmtTimestamp), generatedBy: 'ai',
    });
    await signal.save();
    logger.info(`AI Signal: ${signal.pair} ${signal.direction} (${signal.strategy}) Conf: ${signal.confidenceScore}%`);
    return signal;
  } catch (e) {
    if (e.code === 'ECONNREFUSED') logger.warn(`AI Engine unreachable at ${env.AI_ENGINE_URL}`);
    else logger.error(`Signal generation error:`, e.message);
    return null;
  }
};
