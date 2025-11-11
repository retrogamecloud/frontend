import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import authRepository from '../repositories/authRepository.js';
import redisClient from '../config/redis.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

export class AuthService {
  // Register new user
  async register(username, password, email = null) {
    // Check if user already exists
    const existingUser = await authRepository.findUserByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    if (email) {
      const existingEmail = await authRepository.findUserByEmail(email);
      if (existingEmail) {
        throw new Error('Email already exists');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const user = await authRepository.createUser(username, email, passwordHash);

    // Publish user created event (for user-service to create profile)
    await this.publishUserCreatedEvent(user);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
    };
  }

  // Login user
  async login(username, password) {
    // Find user
    const user = await authRepository.findUserByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await authRepository.storeRefreshToken(user.id, refreshToken, expiresAt);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      jwt.verify(refreshToken, JWT_SECRET);

      // Check if token is blacklisted
      const isBlacklisted = await redisClient.get(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      // Find token in database
      const tokenData = await authRepository.findRefreshToken(refreshToken);
      if (!tokenData) {
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      const user = {
        id: tokenData.user_id,
        username: tokenData.username,
        email: tokenData.email,
      };

      const accessToken = this.generateAccessToken(user);

      return { accessToken };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  // Logout user
  async logout(refreshToken) {
    // Blacklist refresh token
    await redisClient.setEx(`blacklist:${refreshToken}`, 7 * 24 * 60 * 60, 'true');

    // Delete from database
    await authRepository.deleteRefreshToken(refreshToken);
  }

  // Verify access token
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if token is blacklisted
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Generate access token (short-lived)
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        type: 'access',
      },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRY }
    );
  }

  // Generate refresh token (long-lived)
  generateRefreshToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        type: 'refresh',
      },
      JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRY }
    );
  }

  // Publish user created event to message broker
  async publishUserCreatedEvent(user) {
    // Store in Redis for user-service to consume
    const event = {
      event: 'user.created',
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
      },
      timestamp: new Date().toISOString(),
    };

    // Push to Redis list (simple pub/sub)
    await redisClient.lPush('events:user.created', JSON.stringify(event));
    console.log('📤 Published user.created event:', user.id);
  }
}

export default new AuthService();
