import api from './api.config';

class AuthService {
  constructor() {
    this.tokenKey = 'auth_token';
    this.userKey = 'user';
  }

  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem(this.tokenKey, response.data.token);
      localStorage.setItem(this.userKey, JSON.stringify(response.data.user));
    }
    return response.data;
  }

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem(this.tokenKey, response.data.token);
      localStorage.setItem(this.userKey, JSON.stringify(response.data.user));
    }
    return response.data;
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser() {
    const userStr = localStorage.getItem(this.userKey);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (error) {
      this.logout();
      return null;
    }
  }

  async updateProfile(userData) {
    const response = await api.put('/auth/profile', userData);
    if (response.data) {
      const currentUser = this.getCurrentUser();
      const updatedUser = { ...currentUser, ...response.data };
      localStorage.setItem(this.userKey, JSON.stringify(updatedUser));
    }
    return response.data;
  }

  async updatePassword(passwordData) {
    const response = await api.put('/auth/password', passwordData);
    return response.data;
  }

  async uploadProfilePicture(formData) {
    const response = await api.post('/auth/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    if (response.data) {
      const currentUser = this.getCurrentUser();
      const updatedUser = { ...currentUser, profilePicture: response.data.profilePicture };
      localStorage.setItem(this.userKey, JSON.stringify(updatedUser));
    }
    return response.data;
  }

  async deleteAccount() {
    await api.delete('/auth/account');
    this.logout();
  }

  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  updateUser(user) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }
}

export default new AuthService(); 