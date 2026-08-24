/**
 * DELIXA Cryptographic & Security Utilities
 * Secure hashing for credentials, tokens, and verification
 * Compatible across all Mobile (Android, iOS) and Desktop browsers
 */

/**
 * Normalizes credentials across desktop and mobile keyboards:
 * - Converts Arabic-Indic digits (٠-٩) and Eastern Arabic (۰-۹) to standard Latin digits (0-9)
 * - Normalizes Unicode characters via NFKC
 * - Normalizes Unicode dashes/hyphens to standard ASCII minus (-)
 * - Strips invisible zero-width and directional control characters (LTR/RTL marks)
 * - Trims leading/trailing whitespace
 */
export function normalizeCredentialString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFKC')
    // Convert Arabic-Indic digits to Latin (0-9)
    .replace(/[٠-٩]/g, d => (d.charCodeAt(0) - 1632).toString())
    // Convert Eastern Arabic / Persian digits to Latin (0-9)
    .replace(/[۰-۹]/g, d => (d.charCodeAt(0) - 1776).toString())
    // Convert Unicode dashes/hyphens to standard ASCII '-'
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    // Strip zero-width & directional control chars
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .trim();
}

/**
 * Standardizes employee ID lookup (case-insensitive, whitespace-trimmed, dash-normalized)
 */
export function normalizeEmployeeId(id: string): string {
  if (!id) return '';
  return normalizeCredentialString(id)
    .toUpperCase()
    .replace(/\s+/g, '');
}

/**
 * Standardizes password input without altering user's casing
 */
export function normalizePassword(pwd: string): string {
  if (!pwd) return '';
  return normalizeCredentialString(pwd);
}

/**
 * Deterministic salted 64-bit FNV-1a / DJB2 variant hash for secure local/client storage.
 * Runs identically in all ECMAScript engines (Desktop Chrome/Safari, Android Chrome, WebViews).
 */
export function hashPassword(plainText: string, salt: string = 'delixa_secure_salt_v1'): string {
  if (!plainText) return '';
  const normalized = normalizePassword(plainText);
  const input = `${salt}:${normalized}:${salt}`;
  let hash1 = 0x811c9dc5;
  let hash2 = 0x531fed21;
  
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    hash1 ^= code;
    hash1 = (hash1 * 0x01000193) >>> 0;
    
    hash2 = ((hash2 << 5) - hash2 + (code * 31)) >>> 0;
  }
  
  const part1 = hash1.toString(16).padStart(8, '0');
  const part2 = hash2.toString(16).padStart(8, '0');
  return `dlx_hash_${part1}${part2}`;
}

/**
 * Known fallback passwords for pre-configured demo test accounts
 */
const DEMO_ACCOUNT_PASSWORDS: Record<string, string[]> = {
  'CR-101': ['CR101K', '123456', 'password123'],
  'CR-102': ['CR102M', '123456', 'password123'],
  'CR101': ['CR101K', '123456', 'password123'],
  'CR102': ['CR102M', '123456', 'password123'],
};

/**
 * Verify an entered password against a stored password (hash or legacy plain),
 * taking into account mobile normalization, case variations for alphanumeric PINs,
 * and backward compatibility for demo accounts.
 */
export function verifyPassword(
  enteredPassword: string, 
  storedPasswordHash: string,
  employeeIdContext?: string
): boolean {
  if (!enteredPassword || !storedPasswordHash) return false;
  
  const normalizedEntered = normalizePassword(enteredPassword);
  if (!normalizedEntered) return false;

  // 1. Direct hash verification with normalized input
  if (storedPasswordHash.startsWith('dlx_hash_')) {
    if (hashPassword(normalizedEntered) === storedPasswordHash) {
      return true;
    }

    // Check uppercase variation for 6-char alphanumeric PINs (e.g. user typed cr101k instead of CR101K on mobile)
    if (hashPassword(normalizedEntered.toUpperCase()) === storedPasswordHash) {
      return true;
    }

    // Check lowercase variation
    if (hashPassword(normalizedEntered.toLowerCase()) === storedPasswordHash) {
      return true;
    }
  } else {
    // Legacy plaintext direct comparison
    const normalizedStored = normalizePassword(storedPasswordHash);
    if (normalizedEntered === normalizedStored) {
      return true;
    }
    if (normalizedEntered.toUpperCase() === normalizedStored.toUpperCase()) {
      return true;
    }
  }

  // 2. Demo account backward compatibility check (for CR-101 / CR-102)
  if (employeeIdContext) {
    const cleanEmpId = normalizeEmployeeId(employeeIdContext);
    const allowedDemoPwds = DEMO_ACCOUNT_PASSWORDS[cleanEmpId];
    if (allowedDemoPwds) {
      const match = allowedDemoPwds.some(dp => 
        dp.toLowerCase() === normalizedEntered.toLowerCase() ||
        dp === normalizedEntered
      );
      if (match) {
        return true;
      }
    }
  }

  return false;
}
