import NodeCache from 'node-cache';

// Cache TTL in seconds (default 1 hour)
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 3600;

// Create cache instance
const imageCache = new NodeCache({
  stdTTL: CACHE_TTL,
  checkperiod: CACHE_TTL * 0.2,
  useClones: false,
  maxKeys: 1000 // Limit cache size
});

/**
 * Generate cache key for transformed images
 */
export const generateCacheKey = (imageId, transformations) => {
  const sortedTransformations = JSON.stringify(transformations, Object.keys(transformations).sort());
  return `img_${imageId}_${Buffer.from(sortedTransformations).toString('base64')}`;
};

/**
 * Get item from cache
 */
export const getFromCache = (key) => {
  try {
    const value = imageCache.get(key);
    if (value) {
      console.log(`🎯 Cache hit: ${key}`);
      return value;
    }
    console.log(`❌ Cache miss: ${key}`);
    return null;
  } catch (error) {
    console.error('Cache get error:', error.message);
    return null;
  }
};

/**
 * Set item in cache
 */
export const setInCache = (key, value, ttl = CACHE_TTL) => {
  try {
    imageCache.set(key, value, ttl);
    console.log(`💾 Cached: ${key}`);
    return true;
  } catch (error) {
    console.error('Cache set error:', error.message);
    return false;
  }
};

/**
 * Delete item from cache
 */
export const deleteFromCache = (key) => {
  try {
    imageCache.del(key);
    console.log(`🗑️  Deleted from cache: ${key}`);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error.message);
    return false;
  }
};

/**
 * Clear all cache entries for a specific image
 */
export const clearImageCache = (imageId) => {
  try {
    const keys = imageCache.keys();
    const imageKeys = keys.filter(key => key.startsWith(`img_${imageId}_`));
    imageKeys.forEach(key => imageCache.del(key));
    console.log(`🧹 Cleared ${imageKeys.length} cache entries for image ${imageId}`);
    return true;
  } catch (error) {
    console.error('Cache clear error:', error.message);
    return false;
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return imageCache.getStats();
};

/**
 * Flush entire cache
 */
export const flushCache = () => {
  imageCache.flushAll();
  console.log('🧹 Cache flushed');
};

export { imageCache };
