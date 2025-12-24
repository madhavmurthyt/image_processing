import { Image } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { deleteFile, UPLOAD_DIR, PROCESSED_DIR } from '../middleware/upload.js';
import { publishToQueue } from '../config/rabbitmq.js';
import { generateCacheKey, getFromCache, setInCache, clearImageCache } from '../config/cache.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload a new image
 * POST /images
 */
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No image file provided');
  }

  const { file } = req;

  // Get image metadata using sharp
  let metadata = {};
  try {
    const imageInfo = await sharp(file.path).metadata();
    metadata = {
      width: imageInfo.width,
      height: imageInfo.height,
      format: imageInfo.format,
      space: imageInfo.space,
      channels: imageInfo.channels,
      hasAlpha: imageInfo.hasAlpha
    };
  } catch (error) {
    console.error('Error reading image metadata:', error.message);
  }

  // Create image record
  const image = await Image.create({
    userId: req.userId,
    originalName: file.originalname,
    filename: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    width: metadata.width || null,
    height: metadata.height || null,
    path: file.path,
    metadata
  });

  res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    data: {
      image: {
        id: image.id,
        originalName: image.originalName,
        filename: image.filename,
        mimeType: image.mimeType,
        size: image.size,
        width: image.width,
        height: image.height,
        metadata: image.metadata,
        createdAt: image.createdAt
      }
    }
  });
});

/**
 * Get image by ID
 * GET /images/:id
 */
export const getImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { format, download } = req.query;

  const image = await Image.findOne({
    where: {
      id,
      userId: req.userId
    }
  });

  if (!image) {
    throw new ApiError(404, 'Image not found');
  }

  // Check if file exists
  if (!fs.existsSync(image.path)) {
    throw new ApiError(404, 'Image file not found on disk');
  }

  // If format conversion requested
  if (format && format !== path.extname(image.filename).slice(1)) {
    const cacheKey = generateCacheKey(id, { format });
    const cachedPath = getFromCache(cacheKey);

    let outputPath;
    if (cachedPath && fs.existsSync(cachedPath)) {
      outputPath = cachedPath;
    } else {
      // Convert image format
      const outputFilename = `${path.basename(image.filename, path.extname(image.filename))}.${format}`;
      outputPath = path.join(PROCESSED_DIR, outputFilename);

      await sharp(image.path)
        .toFormat(format)
        .toFile(outputPath);

      setInCache(cacheKey, outputPath);
    }

    // Set appropriate content type
    const contentTypes = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      tiff: 'image/tiff'
    };

    res.set('Content-Type', contentTypes[format] || 'application/octet-stream');
    
    if (download === 'true') {
      res.set('Content-Disposition', `attachment; filename="${image.originalName.replace(/\.[^/.]+$/, '')}.${format}"`);
    }

    return res.sendFile(path.resolve(outputPath));
  }

  // Send original image
  res.set('Content-Type', image.mimeType);
  
  if (download === 'true') {
    res.set('Content-Disposition', `attachment; filename="${image.originalName}"`);
  }

  res.sendFile(path.resolve(image.path));
});

/**
 * Get image metadata
 * GET /images/:id/metadata
 */
export const getImageMetadata = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const image = await Image.findOne({
    where: {
      id,
      userId: req.userId
    }
  });

  if (!image) {
    throw new ApiError(404, 'Image not found');
  }

  res.json({
    success: true,
    data: {
      id: image.id,
      originalName: image.originalName,
      filename: image.filename,
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      metadata: image.metadata,
      transformations: image.transformations,
      processingStatus: image.processingStatus,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
      lastTransformedAt: image.lastTransformedAt
    }
  });
});

/**
 * List all images for user
 * GET /images
 */
export const listImages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const { count, rows: images } = await Image.findAndCountAll({
    where: { userId: req.userId },
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    attributes: [
      'id', 'originalName', 'filename', 'mimeType', 'size',
      'width', 'height', 'processingStatus', 'createdAt', 'updatedAt'
    ]
  });

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    data: {
      images,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
});

/**
 * Transform image (async via RabbitMQ)
 * POST /images/:id/transform
 */
export const transformImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { transformations } = req.body;

  const image = await Image.findOne({
    where: {
      id,
      userId: req.userId
    }
  });

  if (!image) {
    throw new ApiError(404, 'Image not found');
  }

  // Check if image is already being processed
  if (image.isProcessing) {
    throw new ApiError(409, 'Image is currently being processed. Please wait.');
  }

  // Check if file exists
  if (!fs.existsSync(image.path)) {
    throw new ApiError(404, 'Image file not found on disk');
  }

  // Generate job ID
  const jobId = uuidv4();

  // Update image status
  await image.update({
    isProcessing: true,
    processingStatus: 'pending',
    processingError: null
  });

  // Create job message for queue
  const jobMessage = {
    jobId,
    imageId: image.id,
    userId: req.userId,
    sourcePath: image.path,
    originalFilename: image.filename,
    transformations,
    createdAt: new Date().toISOString()
  };

  // Publish to queue
  await publishToQueue(jobMessage);

  res.status(202).json({
    success: true,
    message: 'Transformation job queued successfully',
    data: {
      jobId,
      imageId: image.id,
      status: 'pending',
      transformations
    }
  });
});

/**
 * Transform image synchronously (for small operations)
 * POST /images/:id/transform/sync
 */
export const transformImageSync = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { transformations } = req.body;

  const image = await Image.findOne({
    where: {
      id,
      userId: req.userId
    }
  });

  if (!image) {
    throw new ApiError(404, 'Image not found');
  }

  // Check if file exists
  if (!fs.existsSync(image.path)) {
    throw new ApiError(404, 'Image file not found on disk');
  }

  // Check cache first
  const cacheKey = generateCacheKey(id, transformations);
  const cachedPath = getFromCache(cacheKey);

  if (cachedPath && fs.existsSync(cachedPath)) {
    // Serve cached transformed image
    return res.sendFile(path.resolve(cachedPath));
  }

  // Process transformation
  let sharpInstance = sharp(image.path);

  // Apply transformations
  const { resize, crop, rotate, format, quality, filters, flip, flop } = transformations;

  if (resize) {
    sharpInstance = sharpInstance.resize(resize.width, resize.height, {
      fit: resize.fit || 'cover',
      position: resize.position || 'center'
    });
  }

  if (crop) {
    sharpInstance = sharpInstance.extract({
      left: crop.x || 0,
      top: crop.y || 0,
      width: crop.width,
      height: crop.height
    });
  }

  if (rotate) {
    sharpInstance = sharpInstance.rotate(rotate);
  }

  if (flip) {
    sharpInstance = sharpInstance.flip();
  }

  if (flop) {
    sharpInstance = sharpInstance.flop();
  }

  if (filters) {
    if (filters.grayscale) {
      sharpInstance = sharpInstance.grayscale();
    }
    if (filters.sepia) {
      // Sepia effect using tint
      sharpInstance = sharpInstance.tint({ r: 112, g: 66, b: 20 });
    }
    if (filters.blur) {
      sharpInstance = sharpInstance.blur(filters.blur);
    }
    if (filters.sharpen) {
      sharpInstance = sharpInstance.sharpen();
    }
    if (filters.negate) {
      sharpInstance = sharpInstance.negate();
    }
  }

  // Determine output format
  const outputFormat = format || path.extname(image.filename).slice(1) || 'jpeg';
  const outputFilename = `${uuidv4()}.${outputFormat}`;
  const outputPath = path.join(PROCESSED_DIR, outputFilename);

  // Set format and quality
  if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
    sharpInstance = sharpInstance.jpeg({ quality: quality || 80 });
  } else if (outputFormat === 'png') {
    sharpInstance = sharpInstance.png({ quality: quality || 80 });
  } else if (outputFormat === 'webp') {
    sharpInstance = sharpInstance.webp({ quality: quality || 80 });
  } else {
    sharpInstance = sharpInstance.toFormat(outputFormat);
  }

  // Save transformed image
  await sharpInstance.toFile(outputPath);

  // Cache the result
  setInCache(cacheKey, outputPath);

  // Update image record
  const newTransformations = [...(image.transformations || []), {
    ...transformations,
    outputPath,
    appliedAt: new Date().toISOString()
  }];

  await image.update({
    transformations: newTransformations,
    lastTransformedAt: new Date()
  });

  // Set content type and send file
  const contentTypes = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    tiff: 'image/tiff'
  };

  res.set('Content-Type', contentTypes[outputFormat] || 'application/octet-stream');
  res.sendFile(path.resolve(outputPath));
});

/**
 * Delete image
 * DELETE /images/:id
 */
export const deleteImage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const image = await Image.findOne({
    where: {
      id,
      userId: req.userId
    }
  });

  if (!image) {
    throw new ApiError(404, 'Image not found');
  }

  // Delete original file
  if (image.path) {
    await deleteFile(image.path);
  }

  // Delete thumbnail if exists
  if (image.thumbnailPath) {
    await deleteFile(image.thumbnailPath);
  }

  // Clear cache for this image
  clearImageCache(id);

  // Delete database record
  await image.destroy();

  res.json({
    success: true,
    message: 'Image deleted successfully'
  });
});

/**
 * Get transformation status
 * GET /images/:id/status
 */
export const getTransformationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const image = await Image.findOne({
    where: {
      id,
      userId: req.userId
    },
    attributes: ['id', 'isProcessing', 'processingStatus', 'processingError', 'lastTransformedAt']
  });

  if (!image) {
    throw new ApiError(404, 'Image not found');
  }

  res.json({
    success: true,
    data: {
      imageId: image.id,
      isProcessing: image.isProcessing,
      status: image.processingStatus,
      error: image.processingError,
      lastTransformedAt: image.lastTransformedAt
    }
  });
});

export default {
  uploadImage,
  getImage,
  getImageMetadata,
  listImages,
  transformImage,
  transformImageSync,
  deleteImage,
  getTransformationStatus
};

