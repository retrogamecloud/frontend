import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { setupRoutes, setupHealthCheck } from '../../src/routes/routes.js';

describe('Routes Configuration', () => {
  describe('setupRoutes', () => {
    test('debe crear app de Express', () => {
      const frontendDir = '/test/frontend';
      const gamesPath = '/test/juegos';
      
      const app = setupRoutes(frontendDir, gamesPath);
      
      expect(app).toBeDefined();
      expect(typeof app.use).toBe('function');
      expect(typeof app.get).toBe('function');
    });

    test('debe retornar instancia válida de Express', () => {
      const frontendDir = '/test/frontend';
      const gamesPath = '/test/juegos';
      
      const app = setupRoutes(frontendDir, gamesPath);
      
      expect(typeof app.listen).toBe('function');
    });
  });

  describe('setupHealthCheck', () => {
    test('debe responder con status healthy', async () => {
      const app = express();
      setupHealthCheck(app);
      
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });

    test('debe incluir timestamp ISO en respuesta', async () => {
      const app = express();
      setupHealthCheck(app);
      
      const response = await request(app).get('/health');
      
      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('string');
      
      // Validar formato ISO
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    test('debe usar código 200', async () => {
      const app = express();
      setupHealthCheck(app);
      
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
    });
  });
});
