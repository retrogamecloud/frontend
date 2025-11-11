import rankingRepository from '../repositories/rankingRepository.js';
import cacheService from '../cache/cacheService.js';

export class RankingService {
  async getGameRanking(game, limit = 50) {
    const cacheKey = `ranking:${game}:${limit}`;
    
    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const ranking = await rankingRepository.getGameRanking(game, limit);
    
    // Add position numbers
    const rankedData = ranking.map((entry, index) => ({
      position: index + 1,
      ...entry,
    }));

    // Cache for 30 seconds (hot data)
    await cacheService.set(cacheKey, rankedData, 30);

    return rankedData;
  }

  async getGlobalRanking(limit = 50) {
    const cacheKey = `ranking:global:${limit}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const ranking = await rankingRepository.getGlobalRanking(limit);
    
    const rankedData = ranking.map((entry, index) => ({
      position: index + 1,
      ...entry,
    }));

    await cacheService.set(cacheKey, rankedData, 30);

    return rankedData;
  }

  async getUserRankInGame(game, userId) {
    const cacheKey = `ranking:${game}:user:${userId}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const rank = await rankingRepository.getUserRankInGame(game, userId);

    if (rank) {
      await cacheService.set(cacheKey, rank, 60);
    }

    return rank;
  }

  async getUserStats(username) {
    const cacheKey = `stats:user:${username}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const stats = await rankingRepository.getUserStats(username);

    await cacheService.set(cacheKey, stats, 300); // 5 minutes

    return stats;
  }

  async getGameStats(game) {
    const cacheKey = `stats:game:${game}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const stats = await rankingRepository.getGameStats(game);

    await cacheService.set(cacheKey, stats, 300);

    return stats;
  }
}

export default new RankingService();
