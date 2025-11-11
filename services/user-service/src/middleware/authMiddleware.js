import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with auth service
    const response = await axios.get(`${AUTH_SERVICE_URL}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      return res.status(403).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Optional auth - doesn't fail if no token
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const response = await axios.get(`${AUTH_SERVICE_URL}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.valid) {
        req.user = response.data.user;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
  }
  
  next();
}
