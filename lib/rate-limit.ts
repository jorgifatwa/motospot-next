// ────────────────────────────────
// Login Rate Limiter
// SECURITY.md Section 5 — prevent brute force attacks
// ────────────────────────────────

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

// In-memory store for rate limiting
// In production, replace with Redis or similar distributed cache
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Default rate limit configuration
 * SECURITY.md Section 5: 5 failed attempts within 10 minutes
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 10 * 60 * 1000, // 10 minutes
  lockoutMs: 15 * 60 * 1000, // 15 minutes lockout
};

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil?: number;
  error?: string;
}

/**
 * Check if an IP/identifier is rate limited
 * @param identifier - IP address or user identifier
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No previous attempts
  if (!entry) {
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - 1,
    };
  }

  // Check if currently locked out
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: entry.lockedUntil,
      error: `Too many failed attempts. Please try again in ${Math.ceil((entry.lockedUntil - now) / 1000 / 60)} minutes.`,
    };
  }

  // Clear expired lockout
  if (entry.lockedUntil && now >= entry.lockedUntil) {
    rateLimitStore.delete(identifier);
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - 1,
    };
  }

  // Check if window has expired
  const windowExpired = now - entry.firstAttempt > config.windowMs;

  if (windowExpired) {
    // Reset counter
    rateLimitStore.delete(identifier);
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - 1,
    };
  }

  // Check if max attempts exceeded
  if (entry.attempts >= config.maxAttempts) {
    const lockedUntil = now + config.lockoutMs;

    // Update entry with lockout
    rateLimitStore.set(identifier, {
      attempts: entry.attempts + 1,
      firstAttempt: entry.firstAttempt,
      lockedUntil,
    });

    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil,
      error: `Too many failed attempts. Please try again in ${Math.ceil(config.lockoutMs / 1000 / 60)} minutes.`,
    };
  }

  // Allow attempt and increment counter
  const remainingAttempts = config.maxAttempts - (entry.attempts + 1);

  return {
    allowed: true,
    remainingAttempts,
  };
}

/**
 * Record a failed login attempt
 * @param identifier - IP address or user identifier
 * @param config - Rate limit configuration
 */
export function recordFailedAttempt(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
): void {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
    });
    return;
  }

  // Increment attempts
  entry.attempts += 1;

  // Update first attempt if window expired
  if (now - entry.firstAttempt > config.windowMs) {
    entry.firstAttempt = now;
    entry.attempts = 1;
  }

  rateLimitStore.set(identifier, entry);
}

/**
 * Clear rate limit for an identifier (on successful login)
 * @param identifier - IP address or user identifier
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Clean up expired entries from the store
 * Should be called periodically to prevent memory leaks
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  const maxAge = DEFAULT_RATE_LIMIT.windowMs + DEFAULT_RATE_LIMIT.lockoutMs;

  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries older than max age
    if (now - entry.firstAttempt > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}
