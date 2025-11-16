import { describe, test, expect, jest } from '@jest/globals';
import { noCacheMiddleware } from '../../src/middleware/cacheMiddleware.js';

describe('Cache Middleware', () => {
  describe('noCacheMiddleware', () => {
    test('debe retornar una función middleware', () => {
      const middleware = noCacheMiddleware();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    test('debe establecer headers de no-cache para archivos .html', () => {
      const middleware = noCacheMiddleware();
      const req = { url: '/index.html' };
      const res = {
        setHeader: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
      expect(next).toHaveBeenCalled();
    });

    test('debe establecer headers para archivos HTML con ruta compleja', () => {
      const middleware = noCacheMiddleware();
      const req = { url: '/subdir/page.html' };
      const res = {
        setHeader: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledTimes(3);
      expect(next).toHaveBeenCalled();
    });

    test('no debe establecer headers para archivos no-HTML', () => {
      const middleware = noCacheMiddleware();
      const req = { url: '/style.css' };
      const res = {
        setHeader: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    test('no debe establecer headers para archivos JS', () => {
      const middleware = noCacheMiddleware();
      const req = { url: '/script.js' };
      const res = {
        setHeader: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    test('no debe establecer headers para imágenes', () => {
      const middleware = noCacheMiddleware();
      const req = { url: '/image.png' };
      const res = {
        setHeader: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });
});
