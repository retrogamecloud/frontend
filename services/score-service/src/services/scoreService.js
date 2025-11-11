import scoreRepository from '../repositories/scoreRepository.js';
import { publishEvent } from '../events/eventPublisher.js';

export class ScoreService {
  async saveScore(userId, username, game, score, metadata = {}) {
    // Check if user already has a score for this game
    const existing = await scoreRepository.findUserScoreForGame(userId, game);

    let savedScore;
    let isNewRecord = false;

    if (existing) {
      // Only update if new score is higher
      if (score > existing.score) {
        savedScore = await scoreRepository.updateScore(existing.id, score);
        isNewRecord = true;

        // Publish score.updated event
        await publishEvent('score.updated', {
          scoreId: savedScore.id,
          userId,
          username,
          game,
          oldScore: existing.score,
          newScore: score,
        });

        // Invalidate cache
        await publishEvent('cache.invalidate', {
          keys: [`ranking:${game}`, 'ranking:global'],
        });
      } else {
        return {
          message: 'Score not updated (lower than current)',
          current: existing.score,
          attempted: score,
        };
      }
    } else {
      // Create new score
      savedScore = await scoreRepository.createScore(userId, username, game, score, metadata);

      // Publish score.created event
      await publishEvent('score.created', {
        scoreId: savedScore.id,
        userId,
        username,
        game,
        score,
      });

      // Invalidate cache
      await publishEvent('cache.invalidate', {
        keys: [`ranking:${game}`, 'ranking:global'],
      });
    }

    return {
      message: isNewRecord ? 'New record!' : 'Score saved',
      score: savedScore,
    };
  }

  async getUserScores(userId) {
    return await scoreRepository.getUserScores(userId);
  }

  async getUserScoreForGame(userId, game) {
    return await scoreRepository.findUserScoreForGame(userId, game);
  }
}

export default new ScoreService();
