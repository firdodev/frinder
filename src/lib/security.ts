/**
 * Security utilities for Frinder app
 * - Input sanitization (XSS prevention)
 * - Rate limiting
 */

// ============================================
// INPUT SANITIZATION (XSS Prevention)
// ============================================

/**
 * HTML entities to escape for XSS prevention
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char] || char);
}

/**
 * Remove potentially dangerous HTML tags and attributes
 */
export function stripHtmlTags(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, 'data-blocked:');
}

/**
 * Sanitize user input - removes dangerous content while preserving safe text
 */
export function sanitizeInput(input: string, options?: {
  maxLength?: number;
  allowNewlines?: boolean;
  trim?: boolean;
}): string {
  if (!input || typeof input !== 'string') return '';
  
  const { maxLength = 5000, allowNewlines = true, trim = true } = options || {};
  
  let sanitized = input;
  
  // Strip HTML tags
  sanitized = stripHtmlTags(sanitized);
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove control characters (except newlines/tabs if allowed)
  if (allowNewlines) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, ' ');
  }
  
  // Trim whitespace
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  // Enforce max length
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize display name - strict sanitization for names
 */
export function sanitizeDisplayName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  
  return sanitizeInput(name, {
    maxLength: 50,
    allowNewlines: false,
    trim: true
  }).replace(/[^\p{L}\p{N}\s\-_.]/gu, ''); // Only allow letters, numbers, spaces, hyphens, underscores, dots
}

/**
 * Sanitize bio/about text
 */
export function sanitizeBio(bio: string): string {
  return sanitizeInput(bio, {
    maxLength: 500,
    allowNewlines: true,
    trim: true
  });
}

/**
 * Sanitize message text
 */
export function sanitizeMessage(message: string): string {
  return sanitizeInput(message, {
    maxLength: 2000,
    allowNewlines: true,
    trim: true
  });
}

/**
 * Sanitize URL - ensure it's a valid, safe URL
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  try {
    const parsed = new URL(url);
    // Only allow http, https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitize array of interests/tags
 */
export function sanitizeInterests(interests: string[]): string[] {
  if (!Array.isArray(interests)) return [];
  
  return interests
    .filter(i => typeof i === 'string' && i.trim())
    .map(i => sanitizeInput(i, { maxLength: 30, allowNewlines: false }))
    .filter(i => i.length > 0)
    .slice(0, 20); // Max 20 interests
}


// ============================================
// RATE LIMITING
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// In-memory rate limit store (per session)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit configurations for different actions
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Swipes: 100 per minute
  swipe: { maxRequests: 100, windowMs: 60 * 1000 },
  
  // Super likes: 10 per hour
  superlike: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  
  // Messages: 60 per minute
  message: { maxRequests: 60, windowMs: 60 * 1000 },
  
  // Profile updates: 10 per minute
  profileUpdate: { maxRequests: 10, windowMs: 60 * 1000 },
  
  // Image uploads: 20 per minute
  imageUpload: { maxRequests: 20, windowMs: 60 * 1000 },
  
  // Match requests: 50 per minute
  matchRequest: { maxRequests: 50, windowMs: 60 * 1000 },
  
  // Group creation: 5 per hour
  groupCreate: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  
  // API calls: 200 per minute (general)
  api: { maxRequests: 200, windowMs: 60 * 1000 },
  
  // Password reset: 3 per hour
  passwordReset: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  
  // Password change: 3 per hour
  passwordChange: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  
  // Report user: 10 per hour
  report: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
};

/**
 * Check if action is rate limited
 * Returns { allowed: boolean, remainingRequests: number, resetIn: number (ms) }
 */
export function checkRateLimit(
  userId: string,
  action: keyof typeof RATE_LIMITS
): { allowed: boolean; remainingRequests: number; resetIn: number } {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { allowed: true, remainingRequests: Infinity, resetIn: 0 };
  }
  
  const key = `${userId}:${action}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // Check if window has expired
  if (!entry || now >= entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return {
      allowed: true,
      remainingRequests: config.maxRequests - 1,
      resetIn: config.windowMs
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetIn: entry.resetTime - now
    };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remainingRequests: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now
  };
}

/**
 * Rate limiter wrapper for async functions
 * Throws error if rate limited
 */
export async function withRateLimit<T>(
  userId: string,
  action: keyof typeof RATE_LIMITS,
  fn: () => Promise<T>
): Promise<T> {
  const { allowed, resetIn } = checkRateLimit(userId, action);
  
  if (!allowed) {
    const resetInSeconds = Math.ceil(resetIn / 1000);
    const resetInMinutes = Math.ceil(resetIn / 60000);
    const timeMsg = resetInMinutes > 1 
      ? `${resetInMinutes} minutes` 
      : `${resetInSeconds} seconds`;
    
    throw new Error(`Rate limit exceeded. Please try again in ${timeMsg}.`);
  }
  
  return fn();
}

/**
 * Clear rate limit for a specific user/action (useful for testing)
 */
export function clearRateLimit(userId: string, action?: keyof typeof RATE_LIMITS) {
  if (action) {
    rateLimitStore.delete(`${userId}:${action}`);
  } else {
    // Clear all limits for user
    for (const key of rateLimitStore.keys()) {
      if (key.startsWith(`${userId}:`)) {
        rateLimitStore.delete(key);
      }
    }
  }
}

/**
 * Get rate limit status for display to user
 */
export function getRateLimitStatus(
  userId: string,
  action: keyof typeof RATE_LIMITS
): { remaining: number; total: number; resetIn: number } {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { remaining: Infinity, total: Infinity, resetIn: 0 };
  }
  
  const key = `${userId}:${action}`;
  const entry = rateLimitStore.get(key);
  const now = Date.now();
  
  if (!entry || now >= entry.resetTime) {
    return {
      remaining: config.maxRequests,
      total: config.maxRequests,
      resetIn: 0
    };
  }
  
  return {
    remaining: Math.max(0, config.maxRequests - entry.count),
    total: config.maxRequests,
    resetIn: entry.resetTime - now
  };
}


// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate age is within reasonable bounds
 */
export function validateAge(age: number): boolean {
  return typeof age === 'number' && age >= 18 && age <= 120;
}

/**
 * Validate photo URL is from allowed domains
 */
export function validatePhotoUrl(url: string): boolean {
  if (!url) return false;
  
  const allowedDomains = [
    'firebasestorage.googleapis.com',
    'storage.googleapis.com',
    'lh3.googleusercontent.com', // Google profile photos
  ];
  
  try {
    const parsed = new URL(url);
    return allowedDomains.some(domain => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

/**
 * Sanitize user profile data before saving
 */
export function sanitizeProfileData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    switch (key) {
      case 'displayName':
        sanitized[key] = sanitizeDisplayName(value as string);
        break;
      case 'bio':
        sanitized[key] = sanitizeBio(value as string);
        break;
      case 'email':
        sanitized[key] = sanitizeEmail(value as string);
        break;
      case 'interests':
        sanitized[key] = sanitizeInterests(value as string[]);
        break;
      case 'city':
      case 'country':
        sanitized[key] = sanitizeInput(value as string, { maxLength: 100, allowNewlines: false });
        break;
      case 'age':
        const age = typeof value === 'number' ? value : parseInt(value as string, 10);
        sanitized[key] = validateAge(age) ? age : 18;
        break;
      case 'photos':
        if (Array.isArray(value)) {
          sanitized[key] = value.filter(url => validatePhotoUrl(url as string));
        }
        break;
      default:
        // Pass through other fields unchanged
        sanitized[key] = value;
    }
  }
  
  return sanitized;
}
