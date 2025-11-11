import scoreService from '../services/scoreService.js';
import { scoreSubmissionsTotal, lastScoreValue } from '../index.js';

export class ScoreController {
  // POST /scores
  async createScore(req, res) {
    try {
      const { game, score, metadata } = req.body;
      const userId = req.user.id;
      const username = req.user.username;

      if (!game || score === undefined) {
        return res.status(400).json({ error: 'Game and score are required' });
      }

      const result = await scoreService.saveScore(userId, username, game, score, metadata);

      // Update Prometheus metrics
      scoreSubmissionsTotal.labels(game, username).inc();
      lastScoreValue.labels(game, username, userId.toString()).set(score);

      // Log for monitoring
      console.log(`🎮 New score: ${username} played ${game} and scored ${score} points`);

      res.json(result);
    } catch (error) {
      console.error('Create score error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /scores/user/:userId
  async getUserScores(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      const scores = await scoreService.getUserScores(userId);

      res.json(scores);
    } catch (error) {
      console.error('Get user scores error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /scores/user/:userId/game/:game
  async getUserScoreForGame(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      const { game } = req.params;

      const score = await scoreService.getUserScoreForGame(userId, game);

      if (!score) {
        return res.status(404).json({ error: 'Score not found' });
      }

      res.json(score);
    } catch (error) {
      console.error('Get user score for game error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new ScoreController();
