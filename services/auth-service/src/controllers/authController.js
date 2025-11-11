import authService from '../services/authService.js';

export class AuthController {
  // POST /auth/register
  async register(req, res) {
    try {
      const { username, password, email } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = await authService.register(username, password, email);

      res.status(201).json({
        message: 'User registered successfully',
        user,
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // POST /auth/login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const result = await authService.login(username, password);

      res.json({
        message: 'Login successful',
        ...result,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ error: error.message });
    }
  }

  // POST /auth/refresh
  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      const result = await authService.refreshToken(refreshToken);

      res.json(result);
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(401).json({ error: error.message });
    }
  }

  // POST /auth/logout
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      await authService.logout(refreshToken);

      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // GET /auth/verify
  async verify(req, res) {
    try {
      // Token already verified by middleware
      res.json({
        valid: true,
        user: req.user,
      });
    } catch (error) {
      console.error('Verify error:', error);
      res.status(401).json({ error: error.message });
    }
  }

  // GET /auth/me
  async me(req, res) {
    try {
      res.json({ user: req.user });
    } catch (error) {
      console.error('Me error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new AuthController();
