import { z } from 'zod';
import { Signal } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { processNewSignal } from '../services/autoTradeService.js';

// Validation schemas
const createSignalSchema = z.object({
  pair: z.string().min(1).transform(v => v.toUpperCase()),
  direction: z.enum(['BUY', 'SELL']),
  strategy: z.enum(['scalping', 'daily']),
  entryZone: z.object({
    min: z.number(),
    max: z.number(),
  }),
  stopLoss: z.number(),
  takeProfit: z.number(),
  confidenceScore: z.number().min(0).max(100),
  platform: z.enum(['pocket_option', 'mt5']),
  generatedBy: z.enum(['ai', 'manual']).default('manual'),
});

const updateResultSchema = z.object({
  outcome: z.enum(['win', 'loss', 'breakeven']),
  pips: z.number().default(0),
  usdtPnL: z.number().default(0),
});

/**
 * GET /api/signals
 */
export const getSignals = async (req, res) => {
  try {
    const { pair, strategy, status, platform, generatedBy, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (pair) filter.pair = pair.toUpperCase();
    if (strategy) filter.strategy = strategy;
    if (status) filter.status = status;
    if (platform) filter.platform = platform;
    if (generatedBy) filter.generatedBy = generatedBy;
    
    if (startDate || endDate) {
      filter.gmtTimestamp = {};
      if (startDate) filter.gmtTimestamp.$gte = new Date(startDate);
      if (endDate) filter.gmtTimestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [signals, total] = await Promise.all([
      Signal.find(filter)
        .sort({ gmtTimestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Signal.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        signals,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get signals error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * GET /api/signals/:id
 */
export const getSignalById = async (req, res) => {
  try {
    const signal = await Signal.findById(req.params.id);
    if (!signal) {
      return res.status(404).json({ success: false, message: 'Signal not found.' });
    }
    res.json({ success: true, data: { signal } });
  } catch (error) {
    logger.error('Get signal error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * POST /api/signals
 */
export const createSignal = async (req, res) => {
  try {
    const validation = createSignalSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues,
      });
    }

    const signalData = {
      ...validation.data,
      gmtTimestamp: new Date(),
      status: 'pending',
    };

    const signal = new Signal(signalData);
    await signal.save();

    // Emit via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('signal:new', signal);
      // Route new signal to auto-trading service
      processNewSignal(signal, io);
    }

    logger.info(`Signal created: ${signal.pair} ${signal.direction} (${signal.strategy}) - Confidence: ${signal.confidenceScore}%`);

    res.status(201).json({ success: true, data: { signal } });
  } catch (error) {
    logger.error('Create signal error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * PATCH /api/signals/:id/status
 */
export const updateSignalStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'active', 'closed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const signal = await Signal.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!signal) {
      return res.status(404).json({ success: false, message: 'Signal not found.' });
    }

    // Emit update
    const io = req.app.get('io');
    if (io) {
      io.emit('signal:update', signal);
    }

    logger.info(`Signal ${signal._id} status updated to: ${status}`);
    res.json({ success: true, data: { signal } });
  } catch (error) {
    logger.error('Update signal status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * PATCH /api/signals/:id/result
 */
export const updateSignalResult = async (req, res) => {
  try {
    const validation = updateResultSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues,
      });
    }

    const signal = await Signal.findByIdAndUpdate(
      req.params.id,
      { 
        tradeResult: validation.data,
        status: 'closed',
      },
      { new: true }
    );

    if (!signal) {
      return res.status(404).json({ success: false, message: 'Signal not found.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('signal:closed', signal);
    }

    logger.info(`Signal ${signal._id} result: ${validation.data.outcome} (${validation.data.usdtPnL} USDT)`);
    res.json({ success: true, data: { signal } });
  } catch (error) {
    logger.error('Update signal result error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * GET /api/signals/stats/today
 */
export const getTodayStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const todayFilter = {
      gmtTimestamp: { $gte: todayStart, $lte: todayEnd },
    };

    const signals = await Signal.find(todayFilter);

    const closedSignals = signals.filter(s => s.status === 'closed' && s.tradeResult?.outcome);
    const wins = closedSignals.filter(s => s.tradeResult.outcome === 'win').length;
    const totalPnL = closedSignals.reduce((sum, s) => sum + (s.tradeResult?.usdtPnL || 0), 0);
    const winRate = closedSignals.length > 0 ? ((wins / closedSignals.length) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        todayPnL: totalPnL,
        winRate: parseFloat(winRate),
        totalSignals: signals.length,
        closedSignals: closedSignals.length,
        wins,
        losses: closedSignals.filter(s => s.tradeResult.outcome === 'loss').length,
      },
    });
  } catch (error) {
    logger.error('Get today stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
