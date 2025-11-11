import gameService from '../services/gameService.js';

const CDN_BASE_URL = process.env.CDN_BASE_URL || 'http://localhost:8085';

export class GameController {
  // GET /games
  async getAllGames(req, res) {
    try {
      const games = await gameService.getAllGames();
      
      // Add full CDN URLs
      const gamesWithUrls = games.map(game => ({
        ...game,
        thumbnail_url: `${CDN_BASE_URL}${game.thumbnail}`,
        download_url: `${CDN_BASE_URL}${game.file_url}`,
      }));

      res.json(gamesWithUrls);
    } catch (error) {
      console.error('Get all games error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /games/:slug
  async getGame(req, res) {
    try {
      const { slug } = req.params;
      const game = await gameService.getGameBySlug(slug);

      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const gameWithUrls = {
        ...game,
        thumbnail_url: `${CDN_BASE_URL}${game.thumbnail}`,
        download_url: `${CDN_BASE_URL}${game.file_url}`,
      };

      res.json(gameWithUrls);
    } catch (error) {
      console.error('Get game error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /games/search?q=query
  async searchGames(req, res) {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: 'Search query required' });
      }

      const games = await gameService.searchGames(q);

      const gamesWithUrls = games.map(game => ({
        ...game,
        thumbnail_url: `${CDN_BASE_URL}${game.thumbnail}`,
        download_url: `${CDN_BASE_URL}${game.file_url}`,
      }));

      res.json(gamesWithUrls);
    } catch (error) {
      console.error('Search games error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /games/tags/:tag
  async getGamesByTag(req, res) {
    try {
      const { tag } = req.params;
      const games = await gameService.getGamesByTag(tag);

      const gamesWithUrls = games.map(game => ({
        ...game,
        thumbnail_url: `${CDN_BASE_URL}${game.thumbnail}`,
        download_url: `${CDN_BASE_URL}${game.file_url}`,
      }));

      res.json(gamesWithUrls);
    } catch (error) {
      console.error('Get games by tag error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /tags
  async getTags(req, res) {
    try {
      const tags = await gameService.getTags();
      res.json(tags);
    } catch (error) {
      console.error('Get tags error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new GameController();
