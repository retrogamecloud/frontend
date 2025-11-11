import express from 'express';
import authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

// Protected routes
router.get('/verify', authenticateToken, (req, res) => authController.verify(req, res));
router.get('/me', authenticateToken, (req, res) => authController.me(req, res));

export default router;
