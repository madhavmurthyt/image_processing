import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROCESSED_DIR = process.env.PROCESSED_DIR || path.join(__dirname, '..', 'processed');

// Ensure processed directory exists
if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

/**
 * Apply transformations to an image
 */
export const applyTransformations = async (sourcePath, transformations, outputFilename = null) => {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  let sharpInstance = sharp(sourcePath);

  const { 
    resize, 
    crop, 
    rotate, 
    format, 
    quality, 
    filters, 
    flip, 
    flop, 
    watermark,
    compress
  } = transformations;

  // Apply resize
  if (resize) {
    const resizeOptions = {
      fit: resize.fit || 'cover',
      position: resize.position || 'center',
      withoutEnlargement: resize.withoutEnlargement || false
    };

    if (resize.width && resize.height) {
      sharpInstance = sharpInstance.resize(resize.width, resize.height, resizeOptions);
    } else if (resize.width) {
      sharpInstance = sharpInstance.resize(resize.width, null, resizeOptions);
    } else if (resize.height) {
      sharpInstance = sharpInstance.resize(null, resize.height, resizeOptions);
    }
  }

  // Apply crop (extract)
  if (crop) {
    sharpInstance = sharpInstance.extract({
      left: crop.x || 0,
      top: crop.y || 0,
      width: crop.width,
      height: crop.height
    });
  }

  // Apply rotation
  if (rotate !== undefined && rotate !== null) {
    sharpInstance = sharpInstance.rotate(rotate, {
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    });
  }

  // Apply flip (vertical)
  if (flip) {
    sharpInstance = sharpInstance.flip();
  }

  // Apply flop (horizontal mirror)
  if (flop) {
    sharpInstance = sharpInstance.flop();
  }

  // Apply filters
  if (filters) {
    // Grayscale
    if (filters.grayscale) {
      sharpInstance = sharpInstance.grayscale();
    }

    // Sepia effect (approximate with tint)
    if (filters.sepia) {
      sharpInstance = sharpInstance.modulate({
        saturation: 0.5
      }).tint({ r: 112, g: 66, b: 20 });
    }

    // Blur
    if (filters.blur) {
      const blurAmount = typeof filters.blur === 'number' ? filters.blur : 3;
      sharpInstance = sharpInstance.blur(blurAmount);
    }

    // Sharpen
    if (filters.sharpen) {
      sharpInstance = sharpInstance.sharpen();
    }

    // Negate (invert colors)
    if (filters.negate) {
      sharpInstance = sharpInstance.negate();
    }

    // Normalize (enhance contrast)
    if (filters.normalize) {
      sharpInstance = sharpInstance.normalize();
    }

    // Gamma correction
    if (filters.gamma) {
      sharpInstance = sharpInstance.gamma(filters.gamma);
    }

    // Brightness adjustment
    if (filters.brightness) {
      sharpInstance = sharpInstance.modulate({
        brightness: filters.brightness
      });
    }

    // Saturation adjustment
    if (filters.saturation) {
      sharpInstance = sharpInstance.modulate({
        saturation: filters.saturation
      });
    }

    // Hue rotation
    if (filters.hue) {
      sharpInstance = sharpInstance.modulate({
        hue: filters.hue
      });
    }
  }

  // Apply watermark (text overlay)
  if (watermark && watermark.text) {
    const watermarkSvg = generateWatermarkSvg(watermark);
    sharpInstance = sharpInstance.composite([{
      input: Buffer.from(watermarkSvg),
      gravity: watermark.position || 'southeast'
    }]);
  }

  // Determine output format
  const sourceExt = path.extname(sourcePath).slice(1).toLowerCase();
  const outputFormat = format || sourceExt || 'jpeg';
  
  // Generate output filename
  const finalOutputFilename = outputFilename || `${uuidv4()}.${outputFormat}`;
  const outputPath = path.join(PROCESSED_DIR, finalOutputFilename);

  // Set format and quality
  const outputQuality = quality || (compress ? 60 : 80);

  switch (outputFormat.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      sharpInstance = sharpInstance.jpeg({ 
        quality: outputQuality,
        mozjpeg: true
      });
      break;
    case 'png':
      sharpInstance = sharpInstance.png({ 
        quality: outputQuality,
        compressionLevel: compress ? 9 : 6
      });
      break;
    case 'webp':
      sharpInstance = sharpInstance.webp({ 
        quality: outputQuality
      });
      break;
    case 'gif':
      sharpInstance = sharpInstance.gif();
      break;
    case 'tiff':
    case 'tif':
      sharpInstance = sharpInstance.tiff({
        quality: outputQuality
      });
      break;
    case 'avif':
      sharpInstance = sharpInstance.avif({
        quality: outputQuality
      });
      break;
    default:
      sharpInstance = sharpInstance.toFormat(outputFormat);
  }

  // Save the transformed image
  const outputInfo = await sharpInstance.toFile(outputPath);

  return {
    path: outputPath,
    filename: finalOutputFilename,
    format: outputFormat,
    width: outputInfo.width,
    height: outputInfo.height,
    size: outputInfo.size
  };
};

/**
 * Generate SVG for text watermark
 */
const generateWatermarkSvg = (watermark) => {
  const {
    text,
    fontSize = 24,
    fontColor = 'rgba(255,255,255,0.5)',
    fontFamily = 'Arial',
    backgroundColor = 'rgba(0,0,0,0.3)',
    padding = 10
  } = watermark;

  const width = text.length * fontSize * 0.6 + padding * 2;
  const height = fontSize + padding * 2;

  return `
    <svg width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundColor}" rx="4" ry="4"/>
      <text 
        x="${width / 2}" 
        y="${height / 2 + fontSize / 3}" 
        font-family="${fontFamily}" 
        font-size="${fontSize}" 
        fill="${fontColor}"
        text-anchor="middle"
      >${escapeXml(text)}</text>
    </svg>
  `;
};

/**
 * Escape XML special characters
 */
const escapeXml = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Get image metadata
 */
export const getImageMetadata = async (imagePath) => {
  const metadata = await sharp(imagePath).metadata();
  return {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    space: metadata.space,
    channels: metadata.channels,
    depth: metadata.depth,
    density: metadata.density,
    hasAlpha: metadata.hasAlpha,
    orientation: metadata.orientation
  };
};

/**
 * Generate thumbnail
 */
export const generateThumbnail = async (sourcePath, options = {}) => {
  const {
    width = 200,
    height = 200,
    fit = 'cover'
  } = options;

  const thumbnailFilename = `thumb_${uuidv4()}.jpeg`;
  const thumbnailPath = path.join(PROCESSED_DIR, thumbnailFilename);

  await sharp(sourcePath)
    .resize(width, height, { fit })
    .jpeg({ quality: 70 })
    .toFile(thumbnailPath);

  return thumbnailPath;
};

/**
 * Validate if file is a valid image
 */
export const validateImage = async (imagePath) => {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      valid: true,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
};

export default {
  applyTransformations,
  getImageMetadata,
  generateThumbnail,
  validateImage
};

