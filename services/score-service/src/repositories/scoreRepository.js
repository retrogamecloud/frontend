import pool from '../config/database.js';

export class ScoreRepository {
  async createScore(userId, username, game, score, metadata = {}) {
    const query = `
      INSERT INTO scores (user_id, username, game, score, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, username, game, score, JSON.stringify(metadata)]);
    return result.rows[0];
  }

  async updateScore(scoreId, newScore) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get old score
      const oldScoreResult = await client.query('SELECT score FROM scores WHERE id = $1', [scoreId]);
      const oldScore = oldScoreResult.rows[0]?.score;

      // Update score
      const updateQuery = `
        UPDATE scores
        SET score = $2
        WHERE id = $1
        RETURNING *
      `;
      const result = await client.query(updateQuery, [scoreId, newScore]);

      // Record history
      if (oldScore !== newScore) {
        await client.query(
          'INSERT INTO score_history (score_id, old_score, new_score) VALUES ($1, $2, $3)',
          [scoreId, oldScore, newScore]
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findUserScoreForGame(userId, game) {
    const query = 'SELECT * FROM scores WHERE user_id = $1 AND game = $2';
    const result = await pool.query(query, [userId, game]);
    return result.rows[0];
  }

  async getUserScores(userId) {
    const query = 'SELECT * FROM scores WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async getTopScoresForGame(game, limit = 50) {
    const query = `
      SELECT id, user_id, username, game, score, created_at
      FROM scores
      WHERE game = $1
      ORDER BY score DESC, created_at ASC
      LIMIT $2
    `;
    const result = await pool.query(query, [game, limit]);
    return result.rows;
  }

  async getGlobalTopScores(limit = 50) {
    const query = `
      SELECT id, user_id, username, game, score, created_at
      FROM scores
      ORDER BY score DESC, created_at ASC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  async getHighestScoreForUser(userId) {
    const query = 'SELECT MAX(score) as highest_score FROM scores WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0]?.highest_score || 0;
  }
}

export default new ScoreRepository();
