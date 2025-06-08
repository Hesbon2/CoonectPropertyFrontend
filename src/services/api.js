const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class Api {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);
      
      // Handle 401 Unauthorized
      if (response.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await fetch(`${BASE_URL}/auth/refresh-token`, {
              method: 'POST',
              headers: defaultHeaders,
              body: JSON.stringify({ refreshToken })
            });

            if (refreshResponse.ok) {
              const { token } = await refreshResponse.json();
              localStorage.setItem('token', token);
              
              // Retry original request with new token
              config.headers.Authorization = `Bearer ${token}`;
              return fetch(`${BASE_URL}${endpoint}`, config);
            }
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError);
            this.handleAuthError();
          }
        } else {
          this.handleAuthError();
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  handleAuthError() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default new Api(); 