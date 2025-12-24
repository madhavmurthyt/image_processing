import { Router } from 'express';
import { register, login, getProfile, updateProfile, changePassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateRegister, validateLogin } from '../middleware/validators.js';
import { body } from 'express-validator';
import { handleValidation } from '../middleware/validators.js';

const router = Router();

/**
 * @route   POST /register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authLimiter, validateRegister, register);

/**
 * @route   POST /login
 * @desc    Login user and return JWT
 * @access  Public
 */
router.post('/login', authLimiter, validateLogin, login);

/**
 * @route   GET /me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, getProfile);

/**
 * @route   PUT /me
 * @desc    Update user profile
 * @access  Private
 */
router.put('/me', authenticate, [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  handleValidation
], updateProfile);

/**
 * @route   PUT /me/password
 * @desc    Change user password
 * @access  Private
 */
router.put('/me/password', authenticate, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  handleValidation
], changePassword);

export default router;

