import rankingService from '../services/rankingService.js';

export class RankingController {
  // GET /rankings/games/:game
  async getGameRanking(req, res) {
    try {
      const { game } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const ranking = await rankingService.getGameRanking(game, limit);

      res.json(ranking);
    } catch (error) {
      console.error('Get game ranking error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /rankings/global
  async getGlobalRanking(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;

      const ranking = await rankingService.getGlobalRanking(limit);

      res.json(ranking);
    } catch (error) {
      console.error('Get global ranking error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /rankings/games/:game/user/:userId
  async getUserRankInGame(req, res) {
    try {
      const { game, userId } = req.params;

      const rank = await rankingService.getUserRankInGame(game, parseInt(userId));

      if (!rank) {
        return res.status(404).json({ error: 'User rank not found' });
      }

      res.json(rank);
    } catch (error) {
      console.error('Get user rank error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /rankings/users/:username/stats
  async getUserStats(req, res) {
    try {
      const { username } = req.params;

      const stats = await rankingService.getUserStats(username);

      res.json(stats);
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /rankings/games/:game/stats
  async getGameStats(req, res) {
    try {
      const { game } = req.params;

      const stats = await rankingService.getGameStats(game);

      res.json(stats);
    } catch (error) {
      console.error('Get game stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new RankingController();
