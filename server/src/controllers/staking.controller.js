import { z } from 'zod';
import { StakingPosition } from '../models/index.js';
import { logger } from '../utils/logger.js';

// Validation schemas
const createStakeSchema = z.object({
  amount: z.number().min(10, 'Minimum stake is 10 USDT'),
  platform: z.enum(['uborastaking', 'gbaty']),
  apy: z.number().min(0),
});

/**
 * GET /api/staking
 * Get all active staking positions for the current user
 */
export const getStakingPositions = async (req, res) => {
  try {
    const positions = await StakingPosition.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { positions },
    });
  } catch (error) {
    logger.error('Get staking positions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * POST /api/staking
 * Create a new staking position (Simulated for demo)
 */
export const createStake = async (req, res) => {
  try {
    const validation = createStakeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues,
      });
    }

    const { amount, platform, apy } = validation.data;

    // In a real scenario, we would verify the transaction hash on the blockchain here
    const position = new StakingPosition({
      userId: req.user._id,
      contractAddress: '0x' + Math.random().toString(16).slice(2, 42).padStart(40, '0'), // Dummy contract
      platform,
      amount,
      startDate: new Date(),
      apy,
      status: 'active',
    });

    await position.save();

    logger.info(`New stake created by ${req.user.email}: ${amount} USDT at ${apy}% APY`);

    res.status(201).json({ success: true, data: { position } });
  } catch (error) {
    logger.error('Create stake error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * POST /api/staking/:id/unstake
 * Unstake an active position
 */
export const unstake = async (req, res) => {
  try {
    const position = await StakingPosition.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!position) {
      return res.status(404).json({ success: false, message: 'Staking position not found.' });
    }

    if (position.status === 'withdrawn') {
      return res.status(400).json({ success: false, message: 'Position is already withdrawn.' });
    }

    position.status = 'withdrawn';
    await position.save();

    logger.info(`Stake withdrawn by ${req.user.email}: Position ${position._id}`);

    res.json({ success: true, data: { position } });
  } catch (error) {
    logger.error('Unstake error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
