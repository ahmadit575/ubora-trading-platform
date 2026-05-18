import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/index.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'trader', 'viewer']).default('viewer'),
  walletAddress: z.string().optional().nullable(),
});

/**
 * Generate JWT token pair
 */
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, role },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Set refresh token as httpOnly cookie
 */
const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues,
      });
    }

    const { email, password } = validation.data;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Contact admin.',
      });
    }

    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    setRefreshCookie(res, refreshToken);

    logger.info(`User logged in: ${user.email} (${user.role})`);

    res.json({
      success: true,
      data: {
        accessToken,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * POST /api/auth/register (admin-only)
 */
export const register = async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues,
      });
    }

    const { name, email, password, role, walletAddress } = validation.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists.',
      });
    }

    // Create user
    const user = new User({
      name,
      email,
      passwordHash: password, // Pre-save hook will hash it
      role,
      walletAddress: walletAddress || null,
    });

    await user.save();

    logger.info(`New user registered: ${email} (${role}) by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: { user: user.toJSON() },
    });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * POST /api/auth/refresh
 */
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided.',
      });
    }

    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token.',
      });
    }

    // Rotate tokens
    const tokens = generateTokens(user._id, user.role);
    setRefreshCookie(res, tokens.refreshToken);

    res.json({
      success: true,
      data: { accessToken: tokens.accessToken },
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token.',
    });
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.json({ success: true, message: 'Logged out successfully.' });
};

/**
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
};

/**
 * GET /api/auth/users (admin only)
 */
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({ success: true, data: { users } });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * PATCH /api/auth/users/:id (admin only)
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    
    if (req.body.role) updates.role = req.body.role;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.name) updates.name = req.body.name;

    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    logger.info(`User updated: ${user.email} by ${req.user.email}`);
    res.json({ success: true, data: { user } });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * PATCH /api/auth/me/wallet
 */
export const updateMyWallet = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { walletAddress }, { new: true }).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    logger.info(`User updated wallet: ${user.email}`);
    res.json({ success: true, data: { user } });
  } catch (error) {
    logger.error('Update wallet error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
