import api from './api.config';
import cache from '../utils/cache';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class StatsService {
  async getOverallStats() {
    try {
      const cacheKey = 'overall_stats';
      const cachedData = cache.get(cacheKey);
      
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        return cachedData.data;
      }

      const response = await api.get('/stats');
      
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching overall stats:', error);
      throw error;
    }
  }
}

export default new StatsService(); 