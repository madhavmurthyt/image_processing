import 'dotenv/config';
import { connectRabbitMQ, consumeFromQueue } from '../config/rabbitmq.js';
import { sequelize } from '../config/database.js';
import { Image } from '../models/index.js';
import { applyTransformations } from '../services/imageProcessor.js';
import { setInCache, generateCacheKey } from '../config/cache.js';

console.log('🔧 Starting Image Processing Worker...');

/**
 * Process image transformation job
 */
const processJob = async (job) => {
  const { jobId, imageId, userId, sourcePath, originalFilename, transformations } = job;

  console.log(`📦 Processing job ${jobId} for image ${imageId}`);
  console.log(`   Transformations:`, JSON.stringify(transformations, null, 2));

  try {
    // Update image status to processing
    await Image.update(
      { 
        processingStatus: 'processing',
        processingError: null 
      },
      { where: { id: imageId } }
    );

    // Apply transformations
    const result = await applyTransformations(sourcePath, transformations);

    console.log(`✅ Transformation complete for job ${jobId}`);
    console.log(`   Output: ${result.path}`);
    console.log(`   Size: ${result.width}x${result.height}, ${result.size} bytes`);

    // Get current image record
    const image = await Image.findByPk(imageId);
    
    if (image) {
      // Update transformation history
      const transformationHistory = [...(image.transformations || []), {
        jobId,
        transformations,
        output: {
          path: result.path,
          filename: result.filename,
          format: result.format,
          width: result.width,
          height: result.height,
          size: result.size
        },
        completedAt: new Date().toISOString()
      }];

      // Update image record
      await image.update({
        isProcessing: false,
        processingStatus: 'completed',
        processingError: null,
        transformations: transformationHistory,
        lastTransformedAt: new Date()
      });

      // Cache the result
      const cacheKey = generateCacheKey(imageId, transformations);
      setInCache(cacheKey, result.path);
    }

    return { success: true, result };
  } catch (error) {
    console.error(`❌ Error processing job ${jobId}:`, error.message);

    // Update image with error status
    await Image.update(
      {
        isProcessing: false,
        processingStatus: 'failed',
        processingError: error.message
      },
      { where: { id: imageId } }
    );

    throw error;
  }
};

/**
 * Initialize worker
 */
const initWorker = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Start consuming messages
    await consumeFromQueue(processJob);

    console.log('✅ Image Processing Worker is running');
    console.log('👂 Waiting for transformation jobs...');

  } catch (error) {
    console.error('❌ Failed to start worker:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down worker...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down worker...');
  process.exit(0);
});

// Start the worker
initWorker();

