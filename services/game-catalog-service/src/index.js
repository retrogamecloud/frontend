import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';
import gameController from './controllers/gameController.js';
import { register, collectDefaultMetrics } from 'prom-client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

collectDefaultMetrics({ register });

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'game-catalog-service' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Public routes
app.get('/games', (req, res) => gameController.getAllGames(req, res));
app.get('/games/search', (req, res) => gameController.searchGames(req, res));
app.get('/games/:slug', (req, res) => gameController.getGame(req, res));
app.get('/games/tags/:tag', (req, res) => gameController.getGamesByTag(req, res));
app.get('/tags', (req, res) => gameController.getTags(req, res));

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Game Catalog Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start game catalog service:', error);
    process.exit(1);
  }
}

start();
