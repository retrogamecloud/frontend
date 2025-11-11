import request from 'supertest';
import express from 'express';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'score-service' });
  });
  
  app.post('/scores', (req, res) => {
    const { userId, gameId, score } = req.body;
    
    if (!userId || !gameId || score === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (score < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    
    res.status(201).json({
      id: 1,
      userId,
      gameId,
      score,
      createdAt: new Date().toISOString()
    });
  });
  
  app.get('/scores/:gameId', (req, res) => {
    res.json([
      { id: 1, userId: 1, score: 1000, username: 'player1' },
      { id: 2, userId: 2, score: 800, username: 'player2' }
    ]);
  });
  
  return app;
};

describe('Score Service', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
    });
  });
  
  describe('POST /scores', () => {
    it('should create a new score', async () => {
      const response = await request(app)
        .post('/scores')
        .send({
          userId: 1,
          gameId: 'doom',
          score: 5000
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.score).toBe(5000);
    });
    
    it('should reject negative scores', async () => {
      const response = await request(app)
        .post('/scores')
        .send({
          userId: 1,
          gameId: 'doom',
          score: -100
        })
        .expect(400);
      
      expect(response.body.error).toMatch(/invalid/i);
    });
  });
  
  describe('GET /scores/:gameId', () => {
    it('should return scores for a game', async () => {
      const response = await request(app)
        .get('/scores/doom')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});
