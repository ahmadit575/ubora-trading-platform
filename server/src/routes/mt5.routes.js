import { Router } from 'express';
import { pollSignals, logExecution, logClose } from '../controllers/mt5.controller.js';

const router = Router();

// MT5 Expert Advisor bridge endpoints
router.get('/signals', pollSignals);
router.post('/trades', logExecution);
router.post('/trades/close', logClose);

export default router;
