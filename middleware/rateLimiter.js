import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * Limits requests to prevent abuse
 */
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    retryAfter: 'Please wait 15 minutes before making more requests.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

/**
 * Authentication rate limiter
 * More strict limits for login/register to prevent brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
    retryAfter: 'Please wait 15 minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  },
  skipSuccessfulRequests: false
});

/**
 * Image transformation rate limiter
 * Strict limits to prevent abuse of CPU-intensive operations
 */
export const transformLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.TRANSFORM_RATE_LIMIT_MAX) || 20, // 20 transformations per window
  message: {
    success: false,
    error: 'Too many transformation requests. Please try again later.',
    retryAfter: 'Transformation rate limit exceeded. Please wait before requesting more transformations.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  },
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated
    return req.userId || req.ip;
  }
});

/**
 * Upload rate limiter
 * Limit file uploads to prevent storage abuse
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    error: 'Upload limit reached. Please try again later.',
    retryAfter: 'You have reached the maximum number of uploads per hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  },
  keyGenerator: (req) => {
    return req.userId || req.ip;
  }
});

export default {
  apiLimiter,
  authLimiter,
  transformLimiter,
  uploadLimiter
};

