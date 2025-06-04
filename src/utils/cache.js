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

  get(key) {
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

  set(key, value, ttlSeconds = 300) {
    try {
      this.cache.set(key, {
        value,
        expiry: Date.now() + (ttlSeconds * 1000)
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  del(pattern) {
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

  delete(key) {
    try {
      this.cache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  clear() {
    try {
      this.cache.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  // Maintain async methods for backward compatibility
  async asyncGet(key) {
    return Promise.resolve(this.get(key));
  }

  async asyncSet(key, value, ttlSeconds = 300) {
    return Promise.resolve(this.set(key, value, ttlSeconds));
  }

  async asyncDel(pattern) {
    return Promise.resolve(this.del(pattern));
  }

  async asyncClear() {
    return Promise.resolve(this.clear());
  }
}

const cache = new Cache();
export default cache; 