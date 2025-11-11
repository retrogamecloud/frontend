import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectRedis } from './cache/cacheService.js';
import { startCacheInvalidationListener } from './events/cacheInvalidationListener.js';
import rankingController from './controllers/rankingController.js';
import { register, collectDefaultMetrics } from 'prom-client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

collectDefaultMetrics({ register });

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ranking-service' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Public routes (read-only)
app.get('/global', (req, res) => rankingController.getGlobalRanking(req, res));
app.get('/games/:game', (req, res) => rankingController.getGameRanking(req, res));
app.get('/games/:game/user/:userId', (req, res) => rankingController.getUserRankInGame(req, res));
app.get('/games/:game/stats', (req, res) => rankingController.getGameStats(req, res));
app.get('/users/:username/stats', (req, res) => rankingController.getUserStats(req, res));

app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  try {
    await connectRedis();
    await startCacheInvalidationListener();

    app.listen(PORT, () => {
      console.log(`🚀 Ranking Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start ranking service:', error);
    process.exit(1);
  }
}

start();
