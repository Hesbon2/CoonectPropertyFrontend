import api from './api.config';

class UserService {
  async updateProfile(profileData) {
    const response = await api.put('/users/profile', profileData);
    // Update local storage with new user data
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  }

  async getUserProfile(userId) {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  }

  async uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    const response = await api.post('/users/profile/picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export default new UserService(); 