# Shared Event Schemas

This directory contains shared event schemas used across microservices for event-driven communication.

## Event Types

### user.created
Published by: `auth-service`  
Consumed by: `user-service`

```json
{
  "event": "user.created",
  "data": {
    "userId": 123,
    "username": "player1",
    "email": "player1@example.com",
    "createdAt": "2025-11-08T10:00:00Z"
  },
  "timestamp": "2025-11-08T10:00:00Z"
}
```

### score.created
Published by: `score-service`  
Consumed by: `ranking-service`, `notification-service`

```json
{
  "event": "score.created",
  "data": {
    "scoreId": 456,
    "userId": 123,
    "username": "player1",
    "game": "doom",
    "score": 15000
  },
  "timestamp": "2025-11-08T10:05:00Z"
}
```

### score.updated
Published by: `score-service`  
Consumed by: `ranking-service`, `notification-service`

```json
{
  "event": "score.updated",
  "data": {
    "scoreId": 456,
    "userId": 123,
    "username": "player1",
    "game": "doom",
    "oldScore": 15000,
    "newScore": 20000
  },
  "timestamp": "2025-11-08T10:10:00Z"
}
```

### cache.invalidate
Published by: `score-service`  
Consumed by: `ranking-service`

```json
{
  "event": "cache.invalidate",
  "data": {
    "keys": ["ranking:doom", "ranking:global"]
  },
  "timestamp": "2025-11-08T10:10:00Z"
}
```

## Event Communication Pattern

Currently using **Redis Lists** as a simple pub/sub mechanism:

- Events are pushed to Redis lists: `events:<event-type>`
- Consumers use `BRPOP` to block and wait for events
- Simple, reliable, and suitable for moderate load

### Future Improvements

For production at scale, consider migrating to:
- **RabbitMQ**: Better message guarantees, routing, dead-letter queues
- **Apache Kafka**: High-throughput, distributed, persistent log
- **NATS**: Lightweight, cloud-native messaging

## Usage Example

### Publishing (in any service)
```javascript
import redisClient from './config/redis.js';

await redisClient.lPush('events:score.created', JSON.stringify({
  event: 'score.created',
  data: { userId: 123, score: 15000 },
  timestamp: new Date().toISOString()
}));
```

### Consuming (in consumer service)
```javascript
while (true) {
  const result = await redisClient.brPop('events:score.created', 0);
  const event = JSON.parse(result.element);
  // Process event
}
```
