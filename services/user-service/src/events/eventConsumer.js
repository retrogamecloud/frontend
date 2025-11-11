import { createClient } from 'redis';
import userService from '../services/userService.js';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

export async function startEventConsumer() {
  await redisClient.connect();
  console.log('✅ Event consumer connected to Redis');

  // Listen for user.created events
  const consumeUserCreated = async () => {
    while (true) {
      try {
        // Block until an event is available (BRPOP)
        const result = await redisClient.brPop('events:user.created', 0);
        
        if (result) {
          const event = JSON.parse(result.element);
          console.log('📥 Received user.created event:', event.data.userId);

          // Create user profile
          await userService.createProfile(
            event.data.userId,
            event.data.username,
            event.data.email
          );

          console.log('✅ Created user profile:', event.data.username);
        }
      } catch (error) {
        console.error('❌ Error consuming user.created event:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
      }
    }
  };

  // Start consuming in background
  consumeUserCreated();
}

export default redisClient;
