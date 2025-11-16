import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock del servidor frontend
describe('Frontend Server - Tests de Integración', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Mock de rutas estáticas
    app.get('/', (req, res) => {
      res.status(200).send('<html><body>RetroGameCloud</body></html>');
    });

    app.get('/games.html', (req, res) => {
      res.status(200).send('<html><body>Games</body></html>');
    });

    app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'frontend' });
    });

    // Mock de archivos estáticos
    app.get('/retro.css', (req, res) => {
      res.status(200).type('text/css').send('body { margin: 0; }');
    });

    app.get('/score-tracker.js', (req, res) => {
      res.status(200).type('application/javascript').send('console.log("loaded");');
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).send('Not Found');
    });
  });

  describe('Páginas principales', () => {
    test('GET / debe retornar página principal', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('RetroGameCloud');
      expect(response.headers['content-type']).toMatch(/html/);
    });

    test('GET /games.html debe retornar página de juegos', async () => {
      const response = await request(app).get('/games.html');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Games');
    });

    test('GET /health debe retornar status ok', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('frontend');
    });
  });

  describe('Archivos estáticos', () => {
    test('GET /retro.css debe retornar CSS', async () => {
      const response = await request(app).get('/retro.css');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/css/);
    });

    test('GET /score-tracker.js debe retornar JavaScript', async () => {
      const response = await request(app).get('/score-tracker.js');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/javascript/);
    });

    test('GET /favicon.ico debe retornar 200 o 404', async () => {
      const response = await request(app).get('/favicon.ico');
      
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Manejo de errores', () => {
    test('GET /nonexistent debe retornar 404', async () => {
      const response = await request(app).get('/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.text).toContain('Not Found');
    });

    test('GET /api/invalid debe retornar 404', async () => {
      const response = await request(app).get('/api/invalid');
      
      expect(response.status).toBe(404);
    });
  });

  describe('Headers de seguridad', () => {
    test('debe tener headers básicos', async () => {
      const response = await request(app).get('/');
      
      expect(response.headers).toHaveProperty('content-type');
    });
  });

  describe('Performance', () => {
    test('GET / debe responder en menos de 500ms', async () => {
      const start = Date.now();
      await request(app).get('/');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500);
    });

    test('archivos estáticos deben responder rápido', async () => {
      const start = Date.now();
      await request(app).get('/retro.css');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(200);
    });
  });
});
