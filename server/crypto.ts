import crypto from 'crypto';

/**
 * Hash password with PBKDF2 and random 16-byte salt
 * Format: "salt:iterations:hash"
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 10000;
  const keyLength = 64;
  const digest = 'sha512';
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest);
  return `${salt}:${iterations}:${derivedKey.toString('hex')}`;
}

/**
 * Verify password against "salt:iterations:hash"
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 3) {
    // Fallback if plain sha256 or simple hash was used
    const simpleHash = crypto.createHash('sha256').update(password).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(simpleHash), Buffer.from(storedHash));
  }

  const [salt, iterationsStr, originalHash] = parts;
  const iterations = parseInt(iterationsStr, 10) || 10000;
  const keyLength = 64;
  const digest = 'sha512';
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest);
  
  try {
    return crypto.timingSafeEqual(Buffer.from(derivedKey.toString('hex')), Buffer.from(originalHash));
  } catch {
    return false;
  }
}

/**
 * Generate secure cryptographically strong random session token (64 hex characters)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
