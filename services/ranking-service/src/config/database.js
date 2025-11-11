import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL (Read Replica)');
});

export default pool;
