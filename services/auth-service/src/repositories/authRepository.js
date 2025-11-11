import pool from '../config/database.js';

export class AuthRepository {
  async createUser(username, email, passwordHash) {
    const query = `
      INSERT INTO users_auth (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at
    `;
    const values = [username, email, passwordHash];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async findUserByUsername(username) {
    const query = 'SELECT * FROM users_auth WHERE username = $1 AND is_active = true';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  async findUserByEmail(email) {
    const query = 'SELECT * FROM users_auth WHERE email = $1 AND is_active = true';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  async findUserById(id) {
    const query = 'SELECT * FROM users_auth WHERE id = $1 AND is_active = true';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  async storeRefreshToken(userId, token, expiresAt) {
    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const result = await pool.query(query, [userId, token, expiresAt]);
    return result.rows[0];
  }

  async findRefreshToken(token) {
    const query = `
      SELECT rt.*, ua.username, ua.email
      FROM refresh_tokens rt
      JOIN users_auth ua ON rt.user_id = ua.id
      WHERE rt.token = $1 AND rt.expires_at > NOW()
    `;
    const result = await pool.query(query, [token]);
    return result.rows[0];
  }

  async deleteRefreshToken(token) {
    const query = 'DELETE FROM refresh_tokens WHERE token = $1';
    await pool.query(query, [token]);
  }

  async deleteAllUserRefreshTokens(userId) {
    const query = 'DELETE FROM refresh_tokens WHERE user_id = $1';
    await pool.query(query, [userId]);
  }

  async cleanExpiredTokens() {
    const query = 'DELETE FROM refresh_tokens WHERE expires_at < NOW()';
    const result = await pool.query(query);
    return result.rowCount;
  }
}

export default new AuthRepository();
