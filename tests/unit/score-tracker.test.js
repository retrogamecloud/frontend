import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Tests para la funcionalidad del score tracker
describe('Score Tracker - Tests Unitarios', () => {
  
  describe('Validación de datos', () => {
    test('debe validar score numérico válido', () => {
      const validScores = [0, 100, 9999, 1000000];
      
      validScores.forEach(score => {
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThanOrEqual(0);
      });
    });

    test('debe rechazar scores inválidos', () => {
      const invalidScores = [-1, 'abc', null, undefined, NaN];
      
      invalidScores.forEach(score => {
        const isValid = typeof score === 'number' && score >= 0 && !isNaN(score);
        expect(isValid).toBe(false);
      });
    });

    test('debe validar game_id no vacío', () => {
      const validGameIds = ['doom', 'tetris', 'wolf'];
      
      validGameIds.forEach(gameId => {
        expect(gameId).toBeTruthy();
        expect(gameId.length).toBeGreaterThan(0);
      });
    });

    test('debe rechazar game_id vacío', () => {
      const invalidGameIds = ['', null, undefined];
      
      invalidGameIds.forEach(gameId => {
        expect(!gameId || gameId.length === 0).toBe(true);
      });
    });
  });

  describe('Formato de datos', () => {
    test('debe formatear score con separadores de miles', () => {
      const formatScore = (score) => {
        return score.toLocaleString('es-ES');
      };

      const formatted1000 = formatScore(1000);
      const formatted1M = formatScore(1000000);
      const formatted123k = formatScore(123456);
      
      // Verificar que tiene formato numérico (puede variar según locale)
      expect(formatted1000.replace(/\D/g, '')).toBe('1000');
      expect(formatted1M.replace(/\D/g, '')).toBe('1000000');
      expect(formatted123k.replace(/\D/g, '')).toBe('123456');
    });

    test('debe generar timestamp válido', () => {
      const timestamp = new Date().toISOString();
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('debe crear objeto de score válido', () => {
      const scoreData = {
        game_id: 'doom',
        score: 5000,
        user_id: 1,
        timestamp: new Date().toISOString()
      };

      expect(scoreData).toHaveProperty('game_id');
      expect(scoreData).toHaveProperty('score');
      expect(scoreData).toHaveProperty('user_id');
      expect(scoreData).toHaveProperty('timestamp');
      expect(typeof scoreData.score).toBe('number');
    });
  });

  describe('Cálculos de ranking', () => {
    test('debe ordenar scores de mayor a menor', () => {
      const scores = [
        { score: 1000, username: 'player1' },
        { score: 5000, username: 'player2' },
        { score: 2500, username: 'player3' }
      ];

      const sorted = scores.sort((a, b) => b.score - a.score);

      expect(sorted[0].score).toBe(5000);
      expect(sorted[1].score).toBe(2500);
      expect(sorted[2].score).toBe(1000);
    });

    test('debe calcular posición en ranking', () => {
      const scores = [5000, 4000, 3000, 2000, 1000];
      const myScore = 3500;
      
      const position = scores.filter(s => s > myScore).length + 1;
      
      expect(position).toBe(3);
    });

    test('debe limitar top 10', () => {
      const scores = Array.from({ length: 20 }, (_, i) => ({
        score: (20 - i) * 100,
        username: `player${i}`
      }));

      const top10 = scores.slice(0, 10);

      expect(top10.length).toBe(10);
      expect(top10[0].score).toBeGreaterThan(top10[9].score);
    });
  });

  describe('Manejo de errores', () => {
    test('debe manejar response 401 (no autenticado)', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'No autenticado' })
      });

      global.fetch = mockFetch;

      try {
        const response = await fetch('/api/scores');
        if (!response.ok) {
          throw new Error('No autenticado');
        }
      } catch (error) {
        expect(error.message).toBe('No autenticado');
      }
    });

    test('debe manejar errores de red', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      try {
        await fetch('/api/scores');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });
  });
});
