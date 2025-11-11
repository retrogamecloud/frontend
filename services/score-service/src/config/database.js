import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        username VARCHAR(50) NOT NULL,
        game VARCHAR(100) NOT NULL,
        score BIGINT NOT NULL DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_scores_user_game ON scores(user_id, game);
      CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game);
      CREATE INDEX IF NOT EXISTS idx_scores_game_score ON scores(game, score DESC);
      CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS score_history (
        id SERIAL PRIMARY KEY,
        score_id INTEGER NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
        old_score BIGINT,
        new_score BIGINT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_score_history_score_id ON score_history(score_id);
    `);

    console.log('✅ Database schema initialized');
  } finally {
    client.release();
  }
}

export default pool;
