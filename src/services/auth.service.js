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
    return userStr ? JSON.parse(userStr) : null;
  }

  async updatePassword(currentPassword, newPassword) {
    const response = await api.put('/auth/password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  async updateProfile(profileData) {
    const response = await api.put('/auth/profile', profileData);
    // Update stored user data
    if (response.data) {
      localStorage.setItem(this.userKey, JSON.stringify(response.data));
    }
    return response.data;
  }

  async uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('profilePicture', file);
    const response = await api.put('/auth/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    // Update stored user data
    if (response.data) {
      localStorage.setItem(this.userKey, JSON.stringify(response.data));
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