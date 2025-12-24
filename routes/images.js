import { Router } from 'express';
import { 
  uploadImage, 
  getImage, 
  getImageMetadata,
  listImages, 
  transformImage,
  transformImageSync,
  deleteImage,
  getTransformationStatus
} from '../controllers/imageController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadLimiter, transformLimiter } from '../middleware/rateLimiter.js';
import { upload, handleUploadError } from '../middleware/upload.js';
import { validateImageId, validatePagination, validateTransformation } from '../middleware/validators.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /images
 * @desc    List all images for user with pagination
 * @access  Private
 */
router.get('/', validatePagination, listImages);

/**
 * @route   POST /images
 * @desc    Upload a new image
 * @access  Private
 */
router.post('/', 
  uploadLimiter, 
  upload.single('image'), 
  handleUploadError, 
  uploadImage
);

/**
 * @route   GET /images/:id
 * @desc    Get image by ID (with optional format conversion)
 * @access  Private
 */
router.get('/:id', validateImageId, getImage);

/**
 * @route   GET /images/:id/metadata
 * @desc    Get image metadata
 * @access  Private
 */
router.get('/:id/metadata', validateImageId, getImageMetadata);

/**
 * @route   GET /images/:id/status
 * @desc    Get transformation status
 * @access  Private
 */
router.get('/:id/status', validateImageId, getTransformationStatus);

/**
 * @route   POST /images/:id/transform
 * @desc    Transform image (async via RabbitMQ)
 * @access  Private
 */
router.post('/:id/transform', 
  transformLimiter, 
  validateTransformation, 
  transformImage
);

/**
 * @route   POST /images/:id/transform/sync
 * @desc    Transform image synchronously
 * @access  Private
 */
router.post('/:id/transform/sync', 
  transformLimiter, 
  validateTransformation, 
  transformImageSync
);

/**
 * @route   DELETE /images/:id
 * @desc    Delete an image
 * @access  Private
 */
router.delete('/:id', validateImageId, deleteImage);

export default router;

