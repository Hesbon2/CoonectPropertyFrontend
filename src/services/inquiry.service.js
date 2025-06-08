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

  async getInquiry(inquiryId) {
    const response = await api.get(`/inquiries/${inquiryId}`);
    return response.data;
  }

  async getInquiries(params = {}) {
    const formattedParams = new URLSearchParams(params);
    const response = await api.get(`/inquiries?${formattedParams.toString()}`);
    return response.data;
  }

  async getMyInquiries(page = 1, limit = 10) {
    const response = await api.get(`/inquiries/me?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getBookmarkedInquiries(page = 1, limit = 10) {
    const response = await api.get(`/inquiries/bookmarked?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getInquiryEngagement(inquiryId) {
    const response = await api.get(`/inquiries/${inquiryId}/engagement`);
    return response.data;
  }

  async addInquiryView(inquiryId) {
    const response = await api.post(`/inquiries/${inquiryId}/views`);
    return response.data;
  }

  async toggleInquiryLike(inquiryId) {
    const response = await api.post(`/inquiries/${inquiryId}/likes`);
    return response.data;
  }

  async toggleInquiryBookmark(inquiryId) {
    const response = await api.post(`/inquiries/${inquiryId}/bookmarks`);
    return response.data;
  }

  async addInquiryMessage(inquiryId, message) {
    const response = await api.post(`/inquiries/${inquiryId}/messages`, { message });
    return response.data;
  }

  async updateInquiry(inquiryId, updateData) {
    const response = await api.put(`/inquiries/${inquiryId}`, updateData);
    return response.data;
  }

  async deleteInquiry(inquiryId) {
    const response = await api.delete(`/inquiries/${inquiryId}`);
    return response.data;
  }

  async searchInquiries(filters = {}) {
    const formattedFilters = this._formatSearchFilters(filters);
    const response = await api.get('/inquiries/search', { params: formattedFilters });
    return response.data;
  }

  async markInquiryAsRead(inquiryId) {
    const response = await api.post(`/inquiries/${inquiryId}/read`);
    return response.data;
  }

  _formatSearchFilters(filters) {
    // Your existing filter formatting logic
    return filters;
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