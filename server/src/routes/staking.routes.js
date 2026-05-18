import { Router } from 'express';
import { getStakingPositions, createStake, unstake } from '../controllers/staking.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All staking routes require authentication and specific roles
router.use(authenticate);
router.use(authorize('admin', 'trader'));

router.get('/', getStakingPositions);
router.post('/', createStake);
router.post('/:id/unstake', unstake);

export default router;
