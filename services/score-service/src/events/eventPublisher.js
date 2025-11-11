import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Error:', err));

export async function connectRedis() {
  await redisClient.connect();
  console.log('✅ Connected to Redis');
}

export async function publishEvent(eventType, data) {
  const event = {
    event: eventType,
    data,
    timestamp: new Date().toISOString(),
  };

  // Publish to Redis list for consumers
  await redisClient.lPush(`events:${eventType}`, JSON.stringify(event));
  console.log(`📤 Published ${eventType} event`);
}

export default redisClient;
