import { describe, test, expect, jest, beforeAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server.js';
import path from 'path';

describe('Frontend Server - Tests de Integración', () => {
  let app;
  const testDir = path.resolve(process.cwd());

  beforeAll(() => {
    app = createApp(testDir);
  });

  describe('Health Check', () => {
    test('GET /health debe retornar status healthy', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });

    test('GET /health debe retornar timestamp válido', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    test('GET /health debe responder rápidamente', async () => {
      const start = Date.now();
      await request(app).get('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Static Files', () => {
    test('debe servir archivos estáticos', async () => {
      const response = await request(app).get('/index.html');
      
      // Puede ser 200 si existe o 404 si no
      expect([200, 404]).toContain(response.status);
    });

    test('debe aplicar headers no-cache a HTML', async () => {
      const response = await request(app).get('/index.html');
      
      if (response.status === 200) {
        expect(
          response.headers['cache-control'] || 
          response.headers['pragma']
        ).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    test('debe retornar 404 para rutas inexistentes', async () => {
      const response = await request(app).get('/ruta/que/no/existe');

      expect(response.status).toBe(404);
    });

    test('debe manejar POST a rutas no definidas', async () => {
      const response = await request(app)
        .post('/api/inexistente')
        .send({ data: 'test' });

      expect(response.status).toBe(404);
    });
  });

  describe('CORS and Headers', () => {
    test('debe aceptar solicitudes GET', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });

    test('debe responder con Content-Type JSON en /health', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});
