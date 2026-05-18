import { Robot, Signal, TradeLog } from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/mt5/signals
 * Called by MT5 EA to poll for pending signals matching its config
 */
export const pollSignals = async (req, res) => {
  try {
    const { robotId } = req.query;
    if (!robotId) {
      return res.status(400).json({ success: false, message: 'robotId is required.' });
    }

    const robot = await Robot.findById(robotId);
    if (!robot) {
      return res.status(404).json({ success: false, message: 'Robot not found.' });
    }

    // 1. Refresh heartbeat to keep robot online
    robot.lastHeartbeat = new Date();
    if (robot.status === 'offline') {
      robot.status = 'running';
    }
    await robot.save();

    // Broadcast status recovery if needed
    const io = req.app.get('io');
    if (io) {
      io.emit('robot:status', { robotId: robot._id, status: robot.status });
    }

    // If robot is paused or stopped, do not send any signals
    if (robot.status !== 'running') {
      return res.json({ success: true, signal: null });
    }

    // 2. Fetch latest pending signal for MT5 that matches robot strategy and pairs
    const pairsNormalized = robot.config?.pairs?.map(p => p.toUpperCase()) || [];
    
    const signal = await Signal.findOne({
      platform: 'mt5',
      status: 'pending',
      strategy: robot.strategy,
      pair: { $in: pairsNormalized }
    }).sort({ gmtTimestamp: -1 });

    if (!signal) {
      return res.json({ success: true, signal: null });
    }

    // Mark signal as active/acknowledged so it isn't sent to other polling requests
    signal.status = 'active';
    await signal.save();

    if (io) {
      io.emit('signal:update', signal);
    }

    logger.info(`📡 [MT5 Bridge] Signal ${signal._id} (${signal.pair}) pulled by Robot: ${robot.name}`);

    // Return order details for the MT5 EA to execute
    res.json({
      success: true,
      signal: {
        id: signal._id,
        pair: signal.pair.replace('/', ''), // E.g. EURUSD
        direction: signal.direction,       // BUY or SELL
        entryPrice: signal.direction === 'BUY' ? signal.entryZone?.min : signal.entryZone?.max,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        lotSize: robot.config?.lotSize || 0.01
      }
    });

  } catch (error) {
    logger.error('Error in pollSignals:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * POST /api/mt5/trades
 * Called by MT5 EA after executing the trade to log it in our DB
 */
export const logExecution = async (req, res) => {
  try {
    const { robotId, signalId, ticket, entryPrice, lotSize } = req.body;
    
    if (!robotId || !signalId || !ticket) {
      return res.status(400).json({ success: false, message: 'robotId, signalId, and ticket are required.' });
    }

    logger.info(`📝 [MT5 Bridge] Order executed in MT5: Signal ${signalId} | Ticket #${ticket} | Entry: ${entryPrice}`);

    const tradeLog = new TradeLog({
      robotId,
      signalId,
      platform: 'mt5',
      openedAt: new Date(),
      lotSize: lotSize || 0.01,
      notes: `Executed successfully inside MetaTrader 5. Ticket: #${ticket}. Entry Price: ${entryPrice}.`
    });

    await tradeLog.save();

    const signal = await Signal.findById(signalId);
    if (signal) {
      signal.status = 'active';
      await signal.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('trade:opened', {
        robotId,
        tradeId: tradeLog._id,
        pair: signal?.pair || 'Forex Asset',
        direction: signal?.direction || 'BUY',
        lotSize: lotSize || 0.01,
        status: 'executing',
        notes: tradeLog.notes
      });
    }

    res.status(201).json({ success: true, tradeId: tradeLog._id });

  } catch (error) {
    logger.error('Error in logExecution:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * POST /api/mt5/trades/close
 * Called by MT5 EA when trade is closed (TP/SL hit or manual exit) to update DB logs
 */
export const logClose = async (req, res) => {
  try {
    const { signalId, ticket, exitPrice, usdtPnL, outcome } = req.body;

    if (!signalId) {
      return res.status(400).json({ success: false, message: 'signalId is required.' });
    }

    logger.info(`📈 [MT5 Bridge] Trade closed in MT5: Signal ${signalId} | Outcome: ${outcome} | PnL: ${usdtPnL}`);

    // Update trade log
    const tradeLog = await TradeLog.findOne({ signalId });
    if (tradeLog) {
      tradeLog.closedAt = new Date();
      tradeLog.usdtPnL = usdtPnL || 0;
      tradeLog.notes += ` Trade closed inside MetaTrader 5 at price: ${exitPrice || 'N/A'}. Final Outcome: ${outcome.toUpperCase()}.`;
      await tradeLog.save();
    }

    // Update signal
    const signal = await Signal.findById(signalId);
    if (signal) {
      signal.status = 'closed';
      signal.tradeResult = {
        outcome: outcome === 'win' ? 'win' : (outcome === 'loss' ? 'loss' : 'breakeven'),
        usdtPnL: usdtPnL || 0,
        pips: 0
      };
      await signal.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('trade:closed', {
        robotId: tradeLog?.robotId,
        tradeId: tradeLog?._id,
        usdtPnL: usdtPnL || 0,
        status: outcome,
        notes: tradeLog?.notes
      });
      
      // Update general robot dashboard status
      if (tradeLog?.robotId) {
        io.emit('robot:status', { robotId: tradeLog.robotId, status: 'running' });
      }
    }

    res.json({ success: true, message: 'Trade log updated successfully.' });

  } catch (error) {
    logger.error('Error in logClose:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
