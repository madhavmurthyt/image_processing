import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Config imports
import { initializeDatabase } from './config/database.js';
import { connectRabbitMQ } from './config/rabbitmq.js';

// Middleware imports
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Ensure required directories exist
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const PROCESSED_DIR = process.env.PROCESSED_DIR || path.join(__dirname, 'processed');

[UPLOAD_DIR, PROCESSED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// ===================
// Middleware
// ===================

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general rate limiting to all requests
app.use(apiLimiter);

// Request logging in development
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
    next();
  });
}

// ===================
// Health Check
// ===================

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Image Processing Service is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

// ===================
// API Routes
// ===================

// Authentication routes
app.use('/', authRoutes);

// Image management routes
app.use('/images', imageRoutes);

// ===================
// Static Files
// ===================

// Serve processed images (for authorized access only)
app.use('/processed', express.static(PROCESSED_DIR));

// ===================
// Error Handling
// ===================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ===================
// Server Startup
// ===================

const startServer = async () => {
  try {
    console.log('🚀 Starting Image Processing Service...');
    console.log(`📍 Environment: ${NODE_ENV}`);
    console.log('');

    // Initialize database
    console.log('📊 Connecting to database...');
    await initializeDatabase();
    console.log('');

    // Connect to RabbitMQ
    console.log('🐰 Connecting to RabbitMQ...');
    try {
      await connectRabbitMQ();
    } catch (error) {
      console.warn('⚠️  RabbitMQ not available. Async processing disabled.');
      console.warn('   Start RabbitMQ and restart the server for async processing.');
      console.log('');
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`🎉 Image Processing Service is running on port ${PORT}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      console.log('📋 Available Endpoints:');
      console.log('');
      console.log('   Authentication:');
      console.log(`   POST   http://localhost:${PORT}/register       - Register new user`);
      console.log(`   POST   http://localhost:${PORT}/login          - Login user`);
      console.log(`   GET    http://localhost:${PORT}/me             - Get profile`);
      console.log(`   PUT    http://localhost:${PORT}/me             - Update profile`);
      console.log(`   PUT    http://localhost:${PORT}/me/password    - Change password`);
      console.log('');
      console.log('   Image Management:');
      console.log(`   POST   http://localhost:${PORT}/images                  - Upload image`);
      console.log(`   GET    http://localhost:${PORT}/images                  - List images`);
      console.log(`   GET    http://localhost:${PORT}/images/:id              - Get image`);
      console.log(`   GET    http://localhost:${PORT}/images/:id/metadata     - Get metadata`);
      console.log(`   GET    http://localhost:${PORT}/images/:id/status       - Get transform status`);
      console.log(`   POST   http://localhost:${PORT}/images/:id/transform      - Transform (async)`);
      console.log(`   POST   http://localhost:${PORT}/images/:id/transform/sync - Transform (sync)`);
      console.log(`   DELETE http://localhost:${PORT}/images/:id              - Delete image`);
      console.log('');
      console.log('   Health:');
      console.log(`   GET    http://localhost:${PORT}/health         - Health check`);
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();

export default app;

