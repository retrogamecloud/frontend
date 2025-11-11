import pool from '../config/database.js';

export class RankingRepository {
  async getGameRanking(game, limit = 50) {
    const query = `
      SELECT user_id, username, game, score, created_at
      FROM scores
      WHERE game = $1
      ORDER BY score DESC, created_at ASC
      LIMIT $2
    `;
    const result = await pool.query(query, [game, limit]);
    return result.rows;
  }

  async getGlobalRanking(limit = 50) {
    const query = `
      SELECT user_id, username, game, score, created_at
      FROM scores
      ORDER BY score DESC, created_at ASC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  async getUserRankInGame(game, userId) {
    const query = `
      WITH ranked_scores AS (
        SELECT user_id, username, score,
               ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC) as rank
        FROM scores
        WHERE game = $1
      )
      SELECT rank, username, score
      FROM ranked_scores
      WHERE user_id = $2
    `;
    const result = await pool.query(query, [game, userId]);
    return result.rows[0];
  }

  async getUserStats(username) {
    const query = `
      SELECT game, score, created_at
      FROM scores
      WHERE username = $1
      ORDER BY score DESC
    `;
    const result = await pool.query(query, [username]);
    return result.rows;
  }

  async getGameStats(game) {
    const query = `
      SELECT 
        COUNT(*) as total_players,
        MAX(score) as highest_score,
        AVG(score) as average_score,
        MIN(score) as lowest_score
      FROM scores
      WHERE game = $1
    `;
    const result = await pool.query(query, [game]);
    return result.rows[0];
  }
}

export default new RankingRepository();
