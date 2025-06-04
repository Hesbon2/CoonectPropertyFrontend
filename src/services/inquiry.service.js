import api from './api.config';
import Inquiry from '../models/inquiry.model';
import cache from '../utils/cache';
import axios from 'axios';
import { API_URL } from '../config';

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

  async getInquiries(queryParams) {
    try {
      const response = await api.get(`/inquiries?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
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
      await cache.del(`stats_${inquiryId}`);
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
      const response = await api.post(`/inquiries/${inquiryId}/likes`);
      // Clear stats cache for this inquiry
      await cache.del(`stats_${inquiryId}`);
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
      const response = await api.post(`/inquiries/${inquiryId}/bookmarks`);
      // Clear bookmarks cache since it will change
      clearCache();
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

  async updateInquiry(inquiryId, updateData) {
    if (!inquiryId) {
      throw new Error('Inquiry ID is required');
    }
    try {
      const response = await api.put(`/inquiries/${inquiryId}`, updateData);
      // Clear all caches since lists might change
      clearCache();
      return response.data;
    } catch (error) {
      console.error('Error updating inquiry:', error);
      throw error;
    }
  }

  async deleteInquiry(inquiryId) {
    try {
      const response = await api.delete(`/inquiries/${inquiryId}`);
      // Clear all caches since lists will change
      clearCache();
      return response.data;
    } catch (error) {
      console.error('Error deleting inquiry:', error);
      throw error;
    }
  }

  // Helper method to format filters for the API
  formatFilters(filters) {
    const {
      requesterType,
      houseType,
      unitSize,
      county,
      ward,
      budget,
      checkInDate,
      checkOutDate,
      specialRequirements,
      description
    } = filters;

    const formattedFilters = {};

    if (requesterType) {
      formattedFilters.requesterType = requesterType;
    }

    if (houseType) {
      formattedFilters.houseType = houseType;
    }

    if (unitSize) {
      formattedFilters.unitSize = unitSize;
    }

    if (county) {
      formattedFilters.county = county;
    }

    if (ward) {
      formattedFilters.ward = ward;
    }

    if (budget) {
      formattedFilters.budget = {
        $lte: parseFloat(budget)
      };
    }

    if (checkInDate) {
      formattedFilters.checkInDate = {
        $gte: new Date(checkInDate)
      };
    }

    if (checkOutDate) {
      formattedFilters.checkOutDate = {
        $lte: new Date(checkOutDate)
      };
    }

    if (specialRequirements) {
      formattedFilters.specialRequirements = {
        $regex: specialRequirements,
        $options: 'i'
      };
    }

    if (description) {
      formattedFilters.description = {
        $regex: description,
        $options: 'i'
      };
    }

    return formattedFilters;
  }

  async searchInquiries(filters) {
    try {
      const formattedFilters = this.formatFilters(filters);
      const cacheKey = `search_${JSON.stringify(formattedFilters)}`;
      const cachedData = getFromCache(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      const response = await api.get('/inquiries/search', { params: formattedFilters });
      setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error searching inquiries:', error);
      throw error;
    }
  }

  buildSearchQuery(filters) {
    const query = {};

    if (filters.requesterType) {
      query.requesterType = filters.requesterType;
    }

    if (filters.county) {
      query.county = filters.county;
    }

    if (filters.ward) {
      query.ward = filters.ward;
    }

    if (filters.houseType) {
      query.houseType = filters.houseType;
    }

    if (filters.unitSize) {
      query.unitSize = filters.unitSize;
    }

    if (filters.budget) {
      query.budget = { $lte: parseFloat(filters.budget) };
    }

    if (filters.checkInDate) {
      query.checkInDate = { $gte: new Date(filters.checkInDate) };
    }

    if (filters.checkOutDate) {
      query.checkOutDate = { $lte: new Date(filters.checkOutDate) };
    }

    if (filters.specialRequirements) {
      query.specialRequirements = { $regex: filters.specialRequirements, $options: 'i' };
    }

    return query;
  }

  handleError(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return error.response.data;
    } else if (error.request) {
      // The request was made but no response was received
      return { message: 'No response received from server' };
    } else {
      // Something happened in setting up the request that triggered an Error
      return { message: error.message };
    }
  }
}

export default new InquiryService(); 