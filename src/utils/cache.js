class Cache {
  constructor() {
    this.cache = new Map();
    this.isDevMode = process.env.NODE_ENV !== 'production';
    
    if (this.isDevMode) {
      console.log('Cache running in development mode (in-memory)');
    } else {
      // In production, we would initialize Redis here
      console.warn('Redis connection not available - falling back to in-memory cache');
    }
  }

  async get(key) {
    try {
      const item = this.cache.get(key);
      if (!item) return null;
      
      if (item.expiry && Date.now() > item.expiry) {
        this.cache.delete(key);
        return null;
      }
      
      return item.value;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    try {
      this.cache.set(key, {
        value,
        expiry: Date.now() + (ttlSeconds * 1000)
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(pattern) {
    try {
      if (pattern.includes('*')) {
        // Handle pattern deletion
        const regex = new RegExp(pattern.replace('*', '.*'));
        for (const key of this.cache.keys()) {
          if (regex.test(key)) {
            this.cache.delete(key);
          }
        }
      } else {
        this.cache.delete(pattern);
      }
    } catch (error) {
      console.error('Cache del error:', error);
    }
  }

  async clearAll() {
    try {
      this.cache.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

const cache = new Cache();
export default cache; 