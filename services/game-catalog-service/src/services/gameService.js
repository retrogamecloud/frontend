import { getDatabase } from '../config/database.js';

export class GameService {
  async getAllGames() {
    const db = getDatabase();
    return await db.collection('games').find({}).toArray();
  }

  async getGameBySlug(slug) {
    const db = getDatabase();
    return await db.collection('games').findOne({ slug });
  }

  async searchGames(query) {
    const db = getDatabase();
    return await db.collection('games')
      .find({
        $text: { $search: query }
      })
      .toArray();
  }

  async getGamesByTag(tag) {
    const db = getDatabase();
    return await db.collection('games')
      .find({ tags: tag })
      .toArray();
  }

  async getGamesByYear(year) {
    const db = getDatabase();
    return await db.collection('games')
      .find({ year: parseInt(year) })
      .toArray();
  }

  async getTags() {
    const db = getDatabase();
    const games = await db.collection('games').find({}).toArray();
    const allTags = games.flatMap(game => game.tags || []);
    return [...new Set(allTags)].sort();
  }
}

export default new GameService();
