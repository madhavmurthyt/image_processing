import { body, param, query, validationResult } from 'express-validator';

/**
 * Handle validation results
 */
export const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

/**
 * User registration validation
 */
export const validateRegister = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  handleValidation
];

/**
 * User login validation
 */
export const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidation
];

/**
 * Image ID parameter validation
 */
export const validateImageId = [
  param('id')
    .isUUID()
    .withMessage('Invalid image ID format'),
  handleValidation
];

/**
 * Pagination query validation
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  handleValidation
];

/**
 * Image transformation validation
 */
export const validateTransformation = [
  param('id')
    .isUUID()
    .withMessage('Invalid image ID format'),
  body('transformations')
    .notEmpty()
    .withMessage('Transformations object is required')
    .isObject()
    .withMessage('Transformations must be an object'),
  body('transformations.resize')
    .optional()
    .isObject()
    .withMessage('Resize must be an object'),
  body('transformations.resize.width')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Width must be between 1 and 10000'),
  body('transformations.resize.height')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Height must be between 1 and 10000'),
  body('transformations.crop')
    .optional()
    .isObject()
    .withMessage('Crop must be an object'),
  body('transformations.crop.width')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Crop width must be a positive integer'),
  body('transformations.crop.height')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Crop height must be a positive integer'),
  body('transformations.crop.x')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Crop x must be a non-negative integer'),
  body('transformations.crop.y')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Crop y must be a non-negative integer'),
  body('transformations.rotate')
    .optional()
    .isInt({ min: -360, max: 360 })
    .withMessage('Rotate must be between -360 and 360 degrees'),
  body('transformations.format')
    .optional()
    .isIn(['jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff', 'bmp'])
    .withMessage('Invalid format. Allowed: jpeg, png, webp, gif, tiff, bmp'),
  body('transformations.quality')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Quality must be between 1 and 100'),
  body('transformations.filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  body('transformations.filters.grayscale')
    .optional()
    .isBoolean()
    .withMessage('Grayscale must be a boolean'),
  body('transformations.filters.sepia')
    .optional()
    .isBoolean()
    .withMessage('Sepia must be a boolean'),
  body('transformations.flip')
    .optional()
    .isBoolean()
    .withMessage('Flip must be a boolean'),
  body('transformations.flop')
    .optional()
    .isBoolean()
    .withMessage('Flop (mirror) must be a boolean'),
  body('transformations.watermark')
    .optional()
    .isObject()
    .withMessage('Watermark must be an object'),
  body('transformations.watermark.text')
    .optional()
    .isString()
    .withMessage('Watermark text must be a string'),
  handleValidation
];

export default {
  handleValidation,
  validateRegister,
  validateLogin,
  validateImageId,
  validatePagination,
  validateTransformation
};

