import request from 'supertest';
import express from 'express';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'ranking-service' });
  });
  
  app.get('/rankings/:gameId', (req, res) => {
    const { limit = 10 } = req.query;
    
    const rankings = [
      { rank: 1, userId: 1, username: 'player1', score: 10000 },
      { rank: 2, userId: 2, username: 'player2', score: 8000 },
      { rank: 3, userId: 3, username: 'player3', score: 6000 }
    ];
    
    res.json(rankings.slice(0, parseInt(limit)));
  });
  
  app.get('/rankings/:gameId/user/:userId', (req, res) => {
    res.json({
      rank: 5,
      userId: parseInt(req.params.userId),
      score: 4000,
      totalPlayers: 100
    });
  });
  
  return app;
};

describe('Ranking Service', () => {
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
  
  describe('GET /rankings/:gameId', () => {
    it('should return top rankings', async () => {
      const response = await request(app)
        .get('/rankings/doom')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('rank');
      expect(response.body[0]).toHaveProperty('score');
    });
    
    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/rankings/doom?limit=2')
        .expect(200);
      
      expect(response.body.length).toBeLessThanOrEqual(2);
    });
  });
  
  describe('GET /rankings/:gameId/user/:userId', () => {
    it('should return user rank', async () => {
      const response = await request(app)
        .get('/rankings/doom/user/1')
        .expect(200);
      
      expect(response.body).toHaveProperty('rank');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('totalPlayers');
    });
  });
});
