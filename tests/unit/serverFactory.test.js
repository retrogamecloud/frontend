import { describe, test, expect } from '@jest/globals';
import { createApp, startServer } from '../../server.js';
import path from 'path';

describe('Server Factory Functions', () => {
  describe('createApp', () => {
    test('debe crear aplicación Express válida', () => {
      const testDir = path.resolve(process.cwd());
      const app = createApp(testDir);

      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
      expect(typeof app.use).toBe('function');
      expect(typeof app.get).toBe('function');
    });

    test('debe aplicar middleware', () => {
      const testDir = path.resolve(process.cwd());
      const app = createApp(testDir);

      expect(app).toBeDefined();
    });

    test('debe manejar directorios con diferentes rutas', () => {
      const testDir1 = '/home/user/frontend';
      const testDir2 = '/var/www/app';

      const app1 = createApp(testDir1);
      const app2 = createApp(testDir2);

      expect(app1).toBeDefined();
      expect(app2).toBeDefined();
    });
  });

  describe('startServer', () => {
    test('debe iniciar servidor en puerto especificado', (done) => {
      const testDir = path.resolve(process.cwd());
      const app = createApp(testDir);
      const port = 9999;

      const server = startServer(app, port);

      expect(server).toBeDefined();
      expect(typeof server.close).toBe('function');

      // Cerrar servidor inmediatamente
      server.close(() => {
        done();
      });
    });

    test('debe retornar instancia de servidor HTTP', (done) => {
      const testDir = path.resolve(process.cwd());
      const app = createApp(testDir);
      const port = 9998;

      const server = startServer(app, port);

      expect(server.listening).toBe(true);

      server.close(() => {
        done();
      });
    });

    test('debe poder iniciar en puertos diferentes', (done) => {
      const testDir = path.resolve(process.cwd());
      const app1 = createApp(testDir);
      const app2 = createApp(testDir);

      const server1 = startServer(app1, 9997);
      const server2 = startServer(app2, 9996);

      expect(server1.listening).toBe(true);
      expect(server2.listening).toBe(true);

      server1.close(() => {
        server2.close(() => {
          done();
        });
      });
    });
  });
});
