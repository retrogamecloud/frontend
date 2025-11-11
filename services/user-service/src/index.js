import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initDatabase } from './config/database.js';
import { startEventConsumer } from './events/eventConsumer.js';
import userController from './controllers/userController.js';
import { authenticateToken, optionalAuth } from './middleware/authMiddleware.js';
import { register, collectDefaultMetrics } from 'prom-client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Prometheus metrics
collectDefaultMetrics({ register });

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-service' });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Routes
app.get('/leaderboard', optionalAuth, (req, res) => userController.getLeaderboard(req, res));
app.get('/username/:username', optionalAuth, (req, res) => userController.getUserByUsername(req, res));
app.get('/:id', optionalAuth, (req, res) => userController.getUser(req, res));
app.get('/:id/stats', optionalAuth, (req, res) => userController.getUserStats(req, res));
app.put('/:id', authenticateToken, (req, res) => userController.updateUser(req, res));

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize and start server
async function start() {
  try {
    await initDatabase();
    await startEventConsumer();

    app.listen(PORT, () => {
      console.log(`🚀 User Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start user service:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

start();
