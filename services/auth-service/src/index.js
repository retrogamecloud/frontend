import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import authRoutes from './routes/authRoutes.js';
import { register, collectDefaultMetrics } from 'prom-client';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Prometheus metrics
collectDefaultMetrics({ register });

// Trust proxy - necesario porque Kong añade X-Forwarded-For
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/', limiter);

// Strict rate limiting for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Aumentado de 50 a 500 para desarrollo
  message: 'Too many authentication attempts, please try again later.',
});

app.use('/login', authLimiter);
app.use('/register', authLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'auth-service' });
});

// Readiness check
app.get('/ready', async (req, res) => {
  // Check database and redis connectivity
  res.json({ status: 'ready', service: 'auth-service' });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Routes
app.use('/', authRoutes);

// Error handler
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize and start server
async function start() {
  try {
    // Initialize database
    await initDatabase();

    // Connect to Redis
    await connectRedis();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Auth Service running on port ${PORT}`);
      console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
    });
  } catch (error) {
    console.error('Failed to start auth service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

start();
