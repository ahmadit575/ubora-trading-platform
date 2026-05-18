import { Router } from 'express';
import { getRobots, createRobot, startRobot, pauseRobot, stopRobot, getRobotLogs, heartbeat } from '../controllers/robot.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Read access: admin, trader
router.get('/', authorize('admin', 'trader'), getRobots);
router.get('/:id/logs', authorize('admin', 'trader'), getRobotLogs);

// Write access: admin, trader
router.post('/', authorize('admin', 'trader'), createRobot);
router.patch('/:id/start', authorize('admin', 'trader'), startRobot);
router.patch('/:id/pause', authorize('admin', 'trader'), pauseRobot);
router.patch('/:id/stop', authorize('admin', 'trader'), stopRobot);

// Heartbeat: no role restriction (robots call this)
router.post('/:id/heartbeat', heartbeat);

export default router;
