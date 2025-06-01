
// Secure API manager to handle sensitive operations
class SecureApiManager {
  private static instance: SecureApiManager;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): SecureApiManager {
    if (!SecureApiManager.instance) {
      SecureApiManager.instance = new SecureApiManager();
    }
    return SecureApiManager.instance;
  }

  // Sanitize input to prevent injection attacks
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .trim()
      .substring(0, 1000); // Limit length
  }

  // Validate YouTube URL
  validateYouTubeUrl(url: string): boolean {
    const sanitized = this.sanitizeInput(url);
    const patterns = [
      /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}/,
      /^https:\/\/youtu\.be\/[A-Za-z0-9_-]{11}/,
      /^https:\/\/www\.youtube\.com\/shorts\/[A-Za-z0-9_-]{11}/
    ];
    return patterns.some(pattern => pattern.test(sanitized));
  }

  // Get cached data
  getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  // Set cached data
  setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Rate limiting
  private rateLimitMap: Map<string, number[]> = new Map();
  
  checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const requests = this.rateLimitMap.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    this.rateLimitMap.set(key, validRequests);
    return true;
  }
}

export default SecureApiManager;
