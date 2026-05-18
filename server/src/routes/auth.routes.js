import { Router } from 'express';
import { login, register, refreshToken, logout, getMe, getUsers, updateUser, updateMyWallet } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public routes
router.post('/login', authLimiter, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// Protected routes
router.get('/me', authenticate, getMe);
router.patch('/me/wallet', authenticate, updateMyWallet);

// Admin-only routes
router.post('/register', authenticate, authorize('admin'), register);
router.get('/users', authenticate, authorize('admin'), getUsers);
router.patch('/users/:id', authenticate, authorize('admin'), updateUser);

export default router;
