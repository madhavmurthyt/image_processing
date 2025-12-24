import { User } from '../models/index.js';
import { generateToken } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

/**
 * Register a new user
 * POST /register
 */
export const register = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;

  // Check if username already exists
  const existingUser = await User.findOne({ where: { username } });
  if (existingUser) {
    throw new ApiError(409, 'Username already exists');
  }

  // Check if email already exists (if provided)
  if (email) {
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      throw new ApiError(409, 'Email already exists');
    }
  }

  // Create user
  const user = await User.create({
    username,
    password,
    email
  });

  // Generate token
  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: user.toJSON(),
      token
    }
  });
});

/**
 * Login user
 * POST /login
 */
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Find user
  const user = await User.findOne({ where: { username } });

  if (!user) {
    throw new ApiError(401, 'Invalid username or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError(401, 'Account is deactivated');
  }

  // Verify password
  const isValidPassword = await user.comparePassword(password);

  if (!isValidPassword) {
    throw new ApiError(401, 'Invalid username or password');
  }

  // Update last login
  await user.update({ lastLogin: new Date() });

  // Generate token
  const token = generateToken(user);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toJSON(),
      token
    }
  });
});

/**
 * Get current user profile
 * GET /me
 */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId, {
    attributes: { exclude: ['password'] }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    data: {
      user: user.toJSON()
    }
  });
});

/**
 * Update user profile
 * PUT /me
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findByPk(req.userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Update allowed fields
  if (email !== undefined) {
    // Check if email already exists
    const existingEmail = await User.findOne({ 
      where: { email },
      attributes: ['id']
    });
    if (existingEmail && existingEmail.id !== user.id) {
      throw new ApiError(409, 'Email already exists');
    }
    user.email = email;
  }

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: user.toJSON()
    }
  });
});

/**
 * Change password
 * PUT /me/password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findByPk(req.userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Verify current password
  const isValidPassword = await user.comparePassword(currentPassword);
  if (!isValidPassword) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

export default {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
};

