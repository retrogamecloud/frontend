import { createClient } from 'redis';
import cacheService from '../cache/cacheService.js';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

export async function startCacheInvalidationListener() {
  await redisClient.connect();
  console.log('✅ Cache invalidation listener connected');

  // Listen for cache.invalidate events
  const consumeInvalidations = async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const result = await redisClient.brPop('events:cache.invalidate', 0);
        
        if (result) {
          const event = JSON.parse(result.element);
          console.log('📥 Received cache.invalidate event');

          // Invalidate specified keys
          if (event.data.keys) {
            await cacheService.invalidate(event.data.keys);
          }

          // Or invalidate by pattern
          if (event.data.pattern) {
            await cacheService.invalidatePattern(event.data.pattern);
          }
        }
      } catch (error) {
        console.error('❌ Error consuming cache.invalidate event:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  };

  consumeInvalidations();
}
