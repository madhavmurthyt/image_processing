# Image Processing Service API

A powerful image processing backend service similar to Cloudinary, built with Node.js. This service allows users to upload images, perform various transformations, and retrieve images in different formats.

## 🚀 Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Image Upload**: Support for JPEG, PNG, GIF, WebP, BMP, TIFF formats (max 10MB)
- **Image Transformations**:
  - Resize (with various fit modes)
  - Crop
  - Rotate
  - Flip (vertical) / Flop (horizontal mirror)
  - Format conversion (JPEG, PNG, WebP, GIF, TIFF, AVIF)
  - Quality/compression control
  - Filters (grayscale, sepia, blur, sharpen, negate, normalize)
  - Watermark (text overlay)
- **Async Processing**: RabbitMQ-based queue for heavy transformations
- **Caching**: In-memory caching for transformed images
- **Rate Limiting**: Protection against API abuse
- **Pagination**: Efficient listing of images

## 📁 Project Structure

```
image_processing/
├── app.js                          # Main application entry point
├── package.json                    # Dependencies and scripts
├── .env                            # Environment variables (create from .env.example)
├── .gitignore                      # Git ignore rules
│
├── config/
│   ├── database.js                 # PostgreSQL/Sequelize configuration
│   ├── rabbitmq.js                 # RabbitMQ connection and queue management
│   └── cache.js                    # In-memory caching configuration
│
├── models/
│   ├── index.js                    # Model associations and exports
│   ├── user.js                     # User model (authentication)
│   └── image.js                    # Image model (metadata storage)
│
├── middleware/
│   ├── auth.js                     # JWT authentication middleware
│   ├── rateLimiter.js              # Rate limiting middleware
│   ├── upload.js                   # Multer file upload configuration
│   ├── validators.js               # Request validation middleware
│   └── errorHandler.js             # Global error handling
│
├── controllers/
│   ├── authController.js           # Authentication logic
│   └── imageController.js          # Image management logic
│
├── routes/
│   ├── auth.js                     # Authentication routes
│   └── images.js                   # Image management routes
│
├── services/
│   └── imageProcessor.js           # Sharp-based image processing
│
├── workers/
│   └── imageWorker.js              # RabbitMQ consumer for async processing
│
├── uploads/                        # Original uploaded images
└── processed/                      # Transformed images
```

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Message Queue**: RabbitMQ
- **Image Processing**: Sharp
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Rate Limiting**: express-rate-limit
- **File Upload**: Multer

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- RabbitMQ 3.x

## ⚙️ Installation

1. **Clone and navigate to the project**:
   ```bash
   cd image_processing
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** in `.env`:
   ```env
   # Server
   PORT=3000
   NODE_ENV=development

   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=image_processing_db
   DB_USER=postgres
   DB_PASSWORD=your_password

   # JWT
   JWT_SECRET=your-super-secret-key
   JWT_EXPIRES_IN=24h

   # RabbitMQ
   RABBITMQ_URL=amqp://localhost:5672
   RABBITMQ_QUEUE=image_transformations
   ```

5. **Create the PostgreSQL database**:
   ```bash
   createdb image_processing_db
   ```

6. **Start RabbitMQ** (if using Docker):
   ```bash
   docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
   ```

## 🚀 Running the Service

### Development Mode

```bash
# Start the API server
npm run dev

# In a separate terminal, start the worker
npm run worker
```

### Production Mode

```bash
# Start both server and worker
npm run start:all
```

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register a new user |
| POST | `/login` | Login and get JWT token |
| GET | `/me` | Get current user profile |
| PUT | `/me` | Update user profile |
| PUT | `/me/password` | Change password |

### Image Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/images` | Upload a new image |
| GET | `/images` | List all images (paginated) |
| GET | `/images/:id` | Get/download an image |
| GET | `/images/:id/metadata` | Get image metadata |
| GET | `/images/:id/status` | Get transformation status |
| POST | `/images/:id/transform` | Transform image (async) |
| POST | `/images/:id/transform/sync` | Transform image (sync) |
| DELETE | `/images/:id` | Delete an image |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health status |

## 📖 API Usage Examples

### Register User

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123"
  }'
```

### Upload Image

```bash
curl -X POST http://localhost:3000/images \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

### List Images

```bash
curl http://localhost:3000/images?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Image

```bash
# Get original image
curl http://localhost:3000/images/IMAGE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output image.jpg

# Get image in different format
curl "http://localhost:3000/images/IMAGE_ID?format=webp" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output image.webp
```

### Transform Image (Async)

```bash
curl -X POST http://localhost:3000/images/IMAGE_ID/transform \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transformations": {
      "resize": {
        "width": 800,
        "height": 600
      },
      "rotate": 90,
      "format": "webp",
      "quality": 85,
      "filters": {
        "grayscale": true
      }
    }
  }'
```

### Transform Image (Sync)

```bash
curl -X POST http://localhost:3000/images/IMAGE_ID/transform/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transformations": {
      "resize": {
        "width": 400,
        "height": 300
      },
      "filters": {
        "sepia": true
      }
    }
  }' \
  --output transformed.jpg
```

## 🔄 Transformation Options

```json
{
  "transformations": {
    "resize": {
      "width": 800,
      "height": 600,
      "fit": "cover",
      "position": "center"
    },
    "crop": {
      "width": 400,
      "height": 300,
      "x": 100,
      "y": 50
    },
    "rotate": 90,
    "flip": true,
    "flop": true,
    "format": "webp",
    "quality": 80,
    "compress": true,
    "filters": {
      "grayscale": true,
      "sepia": true,
      "blur": 3,
      "sharpen": true,
      "negate": true,
      "normalize": true,
      "brightness": 1.2,
      "saturation": 1.5,
      "hue": 90
    },
    "watermark": {
      "text": "© 2024",
      "fontSize": 24,
      "fontColor": "rgba(255,255,255,0.5)",
      "position": "southeast"
    }
  }
}
```

## 🔒 Rate Limits

| Endpoint Type | Limit |
|--------------|-------|
| General API | 100 requests / 15 min |
| Authentication | 10 requests / 15 min |
| Transformations | 20 requests / 15 min |
| Uploads | 50 uploads / hour |

## 🧪 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `image_processing_db` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRES_IN` | JWT expiration | `24h` |
| `RABBITMQ_URL` | RabbitMQ URL | `amqp://localhost:5672` |
| `RABBITMQ_QUEUE` | Queue name | `image_transformations` |
| `UPLOAD_DIR` | Upload directory | `./uploads` |
| `PROCESSED_DIR` | Processed images dir | `./processed` |
| `MAX_FILE_SIZE` | Max upload size | `10485760` (10MB) |
| `CACHE_TTL` | Cache TTL (seconds) | `3600` |
| `SKIP_SYNC_PROMPT` | Skip DB sync prompt | `false` |
| `FORCE_SYNC` | Force recreate tables | `false` |

## 📝 License

ISC
https://roadmap.sh/projects/image-processing-service
