import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const response = await axios.get(`${AUTH_SERVICE_URL}/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      return res.status(403).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('❌ Error verificando token:', error.response?.data || error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}
