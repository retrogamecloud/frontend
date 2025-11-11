import userService from '../services/userService.js';

export class UserController {
  // GET /users/:id
  async getUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const profile = await userService.getProfile(userId);

      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /users/username/:username
  async getUserByUsername(req, res) {
    try {
      const { username } = req.params;
      const profile = await userService.getProfileByUsername(username);

      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Get user by username error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // PUT /users/:id
  async updateUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      
      // Verify user can only update their own profile
      if (req.user && req.user.id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updates = req.body;
      const profile = await userService.updateProfile(userId, updates);

      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /users/:id/stats
  async getUserStats(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const stats = await userService.getUserStats(userId);

      res.json(stats);
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /users/leaderboard
  async getLeaderboard(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const leaderboard = await userService.getLeaderboard(limit);

      res.json(leaderboard);
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new UserController();
