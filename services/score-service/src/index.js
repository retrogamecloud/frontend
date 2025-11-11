import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initDatabase } from './config/database.js';
import { connectRedis } from './events/eventPublisher.js';
import scoreController from './controllers/scoreController.js';
import { authenticateToken } from './middleware/authMiddleware.js';
import { register, collectDefaultMetrics, Counter, Gauge } from 'prom-client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

collectDefaultMetrics({ register });

// Custom metrics
export const scoreSubmissionsTotal = new Counter({
  name: 'score_submissions_total',
  help: 'Total number of score submissions',
  labelNames: ['game', 'username'],
  registers: [register]
});

export const lastScoreValue = new Gauge({
  name: 'last_score_value',
  help: 'Last score submitted by user',
  labelNames: ['game', 'username', 'user_id'],
  registers: [register]
});

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'score-service' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Routes (all protected)
app.post('/', authenticateToken, (req, res) => scoreController.createScore(req, res));
app.get('/user/:userId', authenticateToken, (req, res) => scoreController.getUserScores(req, res));
app.get('/user/:userId/game/:game', authenticateToken, (req, res) => scoreController.getUserScoreForGame(req, res));

app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  try {
    await initDatabase();
    await connectRedis();

    app.listen(PORT, () => {
      console.log(`🚀 Score Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start score service:', error);
    process.exit(1);
  }
}

start();
