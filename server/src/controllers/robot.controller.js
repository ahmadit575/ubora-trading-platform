import { z } from 'zod';
import { Robot, TradeLog } from '../models/index.js';
import { logger } from '../utils/logger.js';

// Validation schemas
const createRobotSchema = z.object({
  name: z.string().min(1).max(100),
  platform: z.enum(['pocket_option', 'mt5']),
  strategy: z.enum(['scalping', 'daily']),
  config: z.object({
    pairs: z.array(z.string()).min(1),
    lotSize: z.number().positive().default(0.01),
    maxOpenTrades: z.number().int().positive().default(3),
    slPercent: z.number().positive().default(1),
    tpPercent: z.number().positive().default(2),
    gmtSessionFilter: z.array(z.enum(['london', 'new_york', 'overlap'])).default(['london', 'new_york']),
  }),
});

/**
 * GET /api/robots
 */
export const getRobots = async (req, res) => {
  try {
    const robots = await Robot.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: { robots } });
  } catch (error) {
    logger.error('Get robots error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * POST /api/robots
 */
export const createRobot = async (req, res) => {
  try {
    const validation = createRobotSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues,
      });
    }

    const robot = new Robot({
      ...validation.data,
      status: 'stopped',
      createdBy: req.user._id,
    });

    await robot.save();
    await robot.populate('createdBy', 'name email');

    logger.info(`Robot created: ${robot.name} (${robot.platform}/${robot.strategy}) by ${req.user.email}`);
    res.status(201).json({ success: true, data: { robot } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Robot with this name already exists.' });
    }
    logger.error('Create robot error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * PATCH /api/robots/:id/start
 */
export const startRobot = async (req, res) => {
  try {
    const robot = await Robot.findById(req.params.id);
    if (!robot) {
      return res.status(404).json({ success: false, message: 'Robot not found.' });
    }

    robot.status = 'running';
    robot.lastHeartbeat = new Date();
    await robot.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('robot:status', { robotId: robot._id, status: 'running' });
    }

    logger.info(`Robot started: ${robot.name}`);
    res.json({ success: true, data: { robot } });
  } catch (error) {
    logger.error('Start robot error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * PATCH /api/robots/:id/pause
 */
export const pauseRobot = async (req, res) => {
  try {
    const robot = await Robot.findById(req.params.id);
    if (!robot) {
      return res.status(404).json({ success: false, message: 'Robot not found.' });
    }

    robot.status = 'paused';
    await robot.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('robot:status', { robotId: robot._id, status: 'paused' });
    }

    logger.info(`Robot paused: ${robot.name}`);
    res.json({ success: true, data: { robot } });
  } catch (error) {
    logger.error('Pause robot error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * PATCH /api/robots/:id/stop
 */
export const stopRobot = async (req, res) => {
  try {
    const robot = await Robot.findById(req.params.id);
    if (!robot) {
      return res.status(404).json({ success: false, message: 'Robot not found.' });
    }

    robot.status = 'stopped';
    await robot.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('robot:status', { robotId: robot._id, status: 'stopped' });
    }

    logger.info(`Robot stopped: ${robot.name}`);
    res.json({ success: true, data: { robot } });
  } catch (error) {
    logger.error('Stop robot error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * GET /api/robots/:id/logs
 */
export const getRobotLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      TradeLog.find({ robotId: req.params.id })
        .populate('signalId', 'pair direction strategy')
        .sort({ openedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      TradeLog.countDocuments({ robotId: req.params.id }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (error) {
    logger.error('Get robot logs error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * POST /api/robots/:id/heartbeat
 */
export const heartbeat = async (req, res) => {
  try {
    const robot = await Robot.findById(req.params.id);
    if (!robot) {
      return res.status(404).json({ success: false, message: 'Robot not found.' });
    }

    const wasOffline = robot.status === 'offline';
    robot.lastHeartbeat = new Date();
    if (wasOffline) {
      robot.status = 'running';
    }
    await robot.save();

    if (wasOffline) {
      const io = req.app.get('io');
      if (io) {
        io.emit('robot:status', { robotId: robot._id, status: 'running', recovered: true });
      }
      logger.info(`Robot recovered from offline: ${robot.name}`);
    }

    res.json({ success: true, data: { acknowledged: true } });
  } catch (error) {
    logger.error('Heartbeat error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
