import api from './api.config';
import Inquiry from '../models/inquiry.model';
import cache from '../utils/cache';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getFromCache = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

const setCache = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

const clearCache = () => {
  cache.clear();
};

class InquiryService {
  async createInquiry(inquiryData) {
    const response = await api.post('/inquiries', inquiryData);
    clearCache(); // Clear cache when creating new inquiry
    return response.data;
  }

  async getInquiries(page = 1, limit = 10) {
    try {
      const cacheKey = `inquiries_${page}_${limit}`;
      const cachedData = getFromCache(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      const response = await api.get(`/inquiries?include=user,engagement&page=${page}&limit=${limit}`);
      setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      throw error;
    }
  }

  async getMyInquiries(userId, page = 1, limit = 10) {
    try {
      const cacheKey = `myInquiries_${userId}_${page}_${limit}`;
      const cachedData = getFromCache(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      const response = await api.get(`/inquiries/me?page=${page}&limit=${limit}`);
      setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching my inquiries:', error);
      throw error;
    }
  }

  async getBookmarkedInquiries(page = 1, limit = 10) {
    try {
      const cacheKey = `bookmarks_${page}_${limit}`;
      const cachedData = getFromCache(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      const response = await api.get(`/inquiries/bookmarked?page=${page}&limit=${limit}`);
      setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching bookmarked inquiries:', error);
      throw error;
    }
  }

  async getInquiryStats(inquiryId) {
    if (!inquiryId) {
      throw new Error('Inquiry ID is required');
    }
    try {
      const cacheKey = `stats_${inquiryId}`;
      const cachedData = getFromCache(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      const response = await api.get(`/inquiries/${inquiryId}/engagement`);
      setCache(cacheKey, response.data);
    return response.data;
    } catch (error) {
      console.error('Error fetching inquiry stats:', error);
      throw error;
    }
  }

  async incrementView(inquiryId) {
    if (!inquiryId) {
      throw new Error('Inquiry ID is required');
    }
    try {
      const response = await api.post(`/inquiries/${inquiryId}/views`);
      // Clear stats cache for this inquiry
      cache.delete(`stats_${inquiryId}`);
    return response.data;
    } catch (error) {
      console.error('Error incrementing view:', error);
      throw error;
    }
  }

  async toggleLike(inquiryId) {
    if (!inquiryId) {
      throw new Error('Inquiry ID is required');
    }
    try {
      const response = await api.post(`/inquiries/${inquiryId}/like`);
      // Clear stats cache for this inquiry
      cache.delete(`stats_${inquiryId}`);
    return response.data;
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }

  async toggleBookmark(inquiryId) {
    if (!inquiryId) {
      throw new Error('Inquiry ID is required');
    }
    try {
    const response = await api.post(`/inquiries/${inquiryId}/bookmark`);
      // Clear bookmarks cache since it's changed
      cache.forEach((value, key) => {
        if (key.startsWith('bookmarks_')) {
          cache.delete(key);
        }
      });
    return response.data;
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      throw error;
    }
  }

  async sendInquiryMessage(inquiryId, message) {
    if (!inquiryId) {
      throw new Error('Inquiry ID is required');
    }
    try {
      const response = await api.post(`/inquiries/${inquiryId}/messages`, { message });
    return response.data;
    } catch (error) {
      console.error('Error sending inquiry message:', error);
      throw error;
    }
  }

  async updateInquiry(id, updates) {
    const result = await Inquiry
      .findByIdAndUpdate(
        id,
        { $set: updates },
        { 
          new: true,
          projection: {
            houseType: 1,
            location: 1,
            budget: 1,
            description: 1,
            'engagement.likes': 1
          }
        }
      )
      .lean();

    // Invalidate related caches
    await cache.del(`inquiry_${id}`);
    await cache.del('myInquiries_*');
    
    return result;
  }

  async deleteInquiry(inquiryId) {
    const response = await api.delete(`/inquiries/${inquiryId}`);
    // Clear all caches since lists will change
    clearCache();
    return response.data;
  }

  // Helper method to format filters for the API
  formatFilters(filters) {
    const {
      location,
      requesterType,
      minNights,
      maxNights,
      minBudget,
      maxBudget,
      status,
    } = filters;

    const formattedFilters = {};

    if (location) formattedFilters.location = location;
    if (requesterType) formattedFilters.requesterType = requesterType;
    if (minNights) formattedFilters.minNights = minNights;
    if (maxNights) formattedFilters.maxNights = maxNights;
    if (minBudget) formattedFilters.minBudget = minBudget;
    if (maxBudget) formattedFilters.maxBudget = maxBudget;
    if (status) formattedFilters.status = status;

    return formattedFilters;
  }

  async searchInquiries(filters) {
    const cacheKey = `search_${JSON.stringify(filters)}`;
    const cachedResult = await cache.get(cacheKey);

    if (cachedResult) {
      return cachedResult;
    }

    const query = this.buildSearchQuery(filters);
    const projection = {
      houseType: 1,
      location: 1,
      budget: 1,
      checkInDate: 1,
      checkOutDate: 1,
      'engagement.likes': 1
    };

    const inquiries = await Inquiry
      .find(query)
      .select(projection)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .exec();

    await cache.set(cacheKey, inquiries, 300);
    return inquiries;
  }

  buildSearchQuery(filters) {
    const query = {};
    
    if (filters.location) {
      query.location = { $regex: new RegExp(filters.location, 'i') };
    }
    
    if (filters.houseType) {
      query.houseType = filters.houseType;
    }
    
    if (filters.budget) {
      query.budget = { $lte: filters.budget };
    }
    
    if (filters.dateRange) {
      query.checkInDate = { $gte: filters.dateRange.start };
      query.checkOutDate = { $lte: filters.dateRange.end };
    }

    return query;
  }
}

export default new InquiryService(); 