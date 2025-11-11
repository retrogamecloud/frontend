import userRepository from '../repositories/userRepository.js';

export class UserService {
  async createProfile(userId, username, email) {
    return await userRepository.createProfile(userId, username, email);
  }

  async getProfile(userId) {
    return await userRepository.getProfileByUserId(userId);
  }

  async getProfileByUsername(username) {
    return await userRepository.getProfileByUsername(username);
  }

  async updateProfile(userId, updates) {
    return await userRepository.updateProfile(userId, updates);
  }

  async updateStats(userId, stats) {
    return await userRepository.updateStats(userId, stats);
  }

  async getLeaderboard(limit = 50) {
    return await userRepository.getLeaderboard(limit);
  }

  async getUserStats(userId) {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error('User not found');
    }

    return {
      username: profile.username,
      total_games_played: profile.total_games_played,
      total_score: profile.total_score,
      highest_score: profile.highest_score,
      favorite_game: profile.favorite_game,
      last_played_at: profile.last_played_at,
    };
  }
}

export default new UserService();
