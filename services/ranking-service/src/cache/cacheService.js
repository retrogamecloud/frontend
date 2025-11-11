import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Error:', err));

export async function connectRedis() {
  await redisClient.connect();
  console.log('✅ Connected to Redis cache');
}

export class CacheService {
  constructor() {
    this.defaultTTL = parseInt(process.env.CACHE_TTL_SHORT) || 30;
  }

  async get(key) {
    try {
      const data = await redisClient.get(key);
      if (data) {
        console.log(`🎯 Cache HIT: ${key}`);
        return JSON.parse(data);
      }
      console.log(`❌ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      console.log(`💾 Cached: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(keys) {
    try {
      if (Array.isArray(keys)) {
        await redisClient.del(keys);
        console.log('🗑️ Invalidated cache keys:', keys);
      } else {
        await redisClient.del(keys);
        console.log(`🗑️ Invalidated cache key: ${keys}`);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`🗑️ Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
    }
  }
}

export default new CacheService();
