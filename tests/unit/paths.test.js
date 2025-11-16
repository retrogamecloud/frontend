import { describe, test, expect } from '@jest/globals';
import { getDirname, getProjectRoot, getGamesPath } from '../../src/config/paths.js';
import path from 'path';

describe('Path Configuration', () => {
  describe('getDirname', () => {
    test('debe extraer dirname de import.meta.url', () => {
      const metaUrl = 'file:///home/user/project/src/index.js';
      const result = getDirname(metaUrl);
      
      expect(result).toBe('/home/user/project/src');
    });

    test('debe manejar rutas de Windows', () => {
      const metaUrl = 'file:///C:/Users/test/project/server.js';
      const result = getDirname(metaUrl);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('project');
    });

    test('debe manejar rutas con espacios', () => {
      const metaUrl = 'file:///home/user/my%20project/index.js';
      const result = getDirname(metaUrl);
      
      expect(typeof result).toBe('string');
    });
  });

  describe('getProjectRoot', () => {
    test('debe retornar directorio padre', () => {
      const dirname = '/home/user/project/frontend';
      const result = getProjectRoot(dirname);
      
      expect(result).toBe('/home/user/project');
    });

    test('debe manejar rutas absolutas', () => {
      const dirname = '/var/www/frontend';
      const result = getProjectRoot(dirname);
      
      expect(result).toBe('/var/www');
    });

    test('debe usar path.resolve', () => {
      const dirname = '/home/user/project/frontend';
      const result = getProjectRoot(dirname);
      
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  describe('getGamesPath', () => {
    test('debe retornar ruta al directorio juegos', () => {
      const projectRoot = '/home/user/project';
      const result = getGamesPath(projectRoot);
      
      expect(result).toBe(path.join('/home/user/project', 'juegos'));
    });

    test('debe manejar rutas con separadores del sistema', () => {
      const projectRoot = '/var/www/app';
      const result = getGamesPath(projectRoot);
      
      expect(result).toContain('juegos');
      expect(path.isAbsolute(result)).toBe(true);
    });

    test('debe usar path.join correctamente', () => {
      const projectRoot = '/home/test';
      const result = getGamesPath(projectRoot);
      
      const expected = path.join(projectRoot, 'juegos');
      expect(result).toBe(expected);
    });
  });
});
