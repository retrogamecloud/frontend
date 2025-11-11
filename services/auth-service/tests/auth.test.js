import request from 'supertest';
import express from 'express';

// Mock app for testing (simula tu auth-service)
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Health endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'auth-service' });
  });
  
  // Register endpoint (simplificado para tests)
  app.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password too short' });
    }
    
    res.status(201).json({
      id: 1,
      username,
      email,
      createdAt: new Date().toISOString()
    });
  });
  
  // Login endpoint (simplificado)
  app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    
    // Mock successful login
    if (username === 'testuser' && password === 'testpass') {
      return res.json({
        token: 'mock-jwt-token',
        user: { id: 1, username: 'testuser' }
      });
    }
    
    res.status(401).json({ error: 'Invalid credentials' });
  });
  
  return app;
};

describe('Auth Service', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toEqual({
        status: 'healthy',
        service: 'auth-service'
      });
    });
  });
  
  describe('POST /register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123'
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username', 'newuser');
      expect(response.body).toHaveProperty('email', 'new@example.com');
    });
    
    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          username: 'newuser'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('should reject short passwords', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: '123'
        })
        .expect(400);
      
      expect(response.body.error).toMatch(/password/i);
    });
  });
  
  describe('POST /login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'testpass'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });
    
    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'wrongpass'
        })
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/login')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });
});
