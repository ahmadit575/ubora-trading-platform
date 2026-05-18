import { Router } from 'express';
import { getSignals, getSignalById, createSignal, updateSignalStatus, updateSignalResult, getTodayStats } from '../controllers/signal.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Read access: all roles
router.get('/', getSignals);
router.get('/stats/today', getTodayStats);
router.get('/:id', getSignalById);

// Write access: admin and trader
router.post('/', authorize('admin', 'trader'), createSignal);
router.patch('/:id/status', authorize('admin', 'trader'), updateSignalStatus);
router.patch('/:id/result', authorize('admin', 'trader'), updateSignalResult);

export default router;
