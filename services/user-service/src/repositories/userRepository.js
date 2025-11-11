import pool from '../config/database.js';

export class UserRepository {
  async createProfile(userId, username, email) {
    const query = `
      INSERT INTO users_profiles (user_id, username, email, display_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [userId, username, email, username]);
    
    // Create user stats
    if (result.rows[0]) {
      await this.createUserStats(userId);
    }
    
    return result.rows[0];
  }

  async createUserStats(userId) {
    const query = `
      INSERT INTO user_stats (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `;
    await pool.query(query, [userId]);
  }

  async getProfileByUserId(userId) {
    const query = `
      SELECT up.*, us.total_games_played, us.total_score, us.highest_score, 
             us.favorite_game, us.last_played_at
      FROM users_profiles up
      LEFT JOIN user_stats us ON up.user_id = us.user_id
      WHERE up.user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  async getProfileByUsername(username) {
    const query = `
      SELECT up.*, us.total_games_played, us.total_score, us.highest_score, 
             us.favorite_game, us.last_played_at
      FROM users_profiles up
      LEFT JOIN user_stats us ON up.user_id = us.user_id
      WHERE up.username = $1
    `;
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  async updateProfile(userId, updates) {
    const allowedFields = ['display_name', 'avatar_url', 'bio'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (fields.length === 0) return null;

    const setClause = fields.map((field, idx) => `${field} = $${idx + 2}`).join(', ');
    const values = [userId, ...fields.map(field => updates[field])];

    const query = `
      UPDATE users_profiles
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async updateStats(userId, stats) {
    const query = `
      UPDATE user_stats
      SET total_games_played = COALESCE($2, total_games_played),
          total_score = COALESCE($3, total_score),
          highest_score = COALESCE($4, highest_score),
          favorite_game = COALESCE($5, favorite_game),
          last_played_at = COALESCE($6, last_played_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId,
      stats.total_games_played,
      stats.total_score,
      stats.highest_score,
      stats.favorite_game,
      stats.last_played_at,
    ]);
    return result.rows[0];
  }

  async getLeaderboard(limit = 50) {
    const query = `
      SELECT up.username, up.display_name, up.avatar_url,
             us.total_score, us.highest_score, us.total_games_played
      FROM user_stats us
      JOIN users_profiles up ON us.user_id = up.user_id
      ORDER BY us.total_score DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }
}

export default new UserRepository();
