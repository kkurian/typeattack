/**
 * Session Hash Calculation
 * Calculates SHA-256 hash of game session data for validation and deduplication
 * Uses Web Crypto API for secure, deterministic hashing
 */

/**
 * Convert string to ArrayBuffer for crypto operations
 */
function stringToArrayBuffer(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer) {
  const byteArray = new Uint8Array(buffer);
  const hexCodes = [...byteArray].map(byte => {
    const hexCode = byte.toString(16);
    const paddedHexCode = hexCode.padStart(2, '0');
    return paddedHexCode;
  });
  return hexCodes.join('');
}

/**
 * Calculate SHA-256 hash using Web Crypto API
 * @param {string} data - Data to hash
 * @returns {Promise<string>} Hex string of hash
 */
async function sha256(data) {
  const msgBuffer = stringToArrayBuffer(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return arrayBufferToHex(hashBuffer);
}

/**
 * Extract deterministic subset of session data for hashing
 * This ensures the hash can be recalculated and verified server-side
 * @param {Object} sessionData - Full session data
 * @returns {Object} Deterministic subset for hashing
 */
function extractDeterministicData(sessionData) {
  // Extract only the fields used for hash calculation
  const deterministic = {
    seed: sessionData.seed,
    stage: sessionData.stage,
    words: [],
    keystrokes: []
  };

  // Extract word texts in sorted order
  if (sessionData.words && Array.isArray(sessionData.words)) {
    deterministic.words = sessionData.words
      .map(w => w.text)
      .filter(text => text) // Remove any null/undefined
      .sort(); // Sort alphabetically for consistency
  }

  // Extract keystrokes with deterministic fields only
  if (sessionData.keystrokes && Array.isArray(sessionData.keystrokes)) {
    deterministic.keystrokes = sessionData.keystrokes.map(k => ({
      key: k.key,
      timestamp: k.timestamp,
      wordIndex: k.wordIndex
    }));
  }

  return deterministic;
}

/**
 * SessionHash class - manages session hash calculation
 */
class SessionHash {
  /**
   * Calculate hash for a game session
   * @param {Object} sessionData - Complete session data
   * @returns {Promise<string>} SHA-256 hash as hex string
   */
  async calculate(sessionData) {
    if (!sessionData) {
      throw new Error('Session data is required');
    }

    // Validate required fields
    if (typeof sessionData.seed === 'undefined') {
      throw new Error('Session seed is required');
    }
    if (typeof sessionData.stage === 'undefined') {
      throw new Error('Session stage is required');
    }
    if (!Array.isArray(sessionData.words)) {
      throw new Error('Session words array is required');
    }
    if (!Array.isArray(sessionData.keystrokes)) {
      throw new Error('Session keystrokes array is required');
    }

    // Extract deterministic data
    const deterministicData = extractDeterministicData(sessionData);

    // Create stable JSON string (deterministic serialization)
    const jsonString = JSON.stringify(deterministicData, null, 0);

    // Calculate SHA-256 hash
    const hash = await sha256(jsonString);

    return hash;
  }

  /**
   * Verify a session hash matches the session data
   * @param {Object} sessionData - Complete session data
   * @param {string} expectedHash - Hash to verify against
   * @returns {Promise<boolean>} True if hash matches
   */
  async verify(sessionData, expectedHash) {
    if (!expectedHash || typeof expectedHash !== 'string') {
      return false;
    }

    try {
      const calculatedHash = await this.calculate(sessionData);
      return calculatedHash === expectedHash.toLowerCase();
    } catch (error) {
      console.error('Hash verification error:', error);
      return false;
    }
  }

  /**
   * Check if Web Crypto API is available
   * @returns {boolean} True if crypto operations are supported
   */
  isSupported() {
    return typeof crypto !== 'undefined' &&
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.subtle.digest === 'function';
  }

  /**
   * Calculate hash synchronously using a fallback (for older browsers)
   * Note: This is less secure and should only be used as a fallback
   * @param {Object} sessionData - Complete session data
   * @returns {string} Simple hash string (64 chars to match SHA-256 length)
   */
  calculateFallback(sessionData) {
    console.warn('Using fallback hash calculation - less secure than Web Crypto API');

    const deterministicData = extractDeterministicData(sessionData);
    const jsonString = JSON.stringify(deterministicData, null, 0);

    // Simple hash function (not cryptographically secure)
    let hash1 = 0, hash2 = 0, hash3 = 0, hash4 = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1) + char;
      hash2 = ((hash2 << 3) - hash2) + char + i;
      hash3 = ((hash3 << 7) - hash3) + char * (i + 1);
      hash4 = ((hash4 << 11) - hash4) + char - i;
      hash1 = hash1 & hash1; // Convert to 32-bit integer
      hash2 = hash2 & hash2;
      hash3 = hash3 & hash3;
      hash4 = hash4 & hash4;
    }

    // Combine hashes to create 64-character string (matching SHA-256 length)
    const part1 = Math.abs(hash1).toString(16).padStart(16, '0');
    const part2 = Math.abs(hash2).toString(16).padStart(16, '0');
    const part3 = Math.abs(hash3).toString(16).padStart(16, '0');
    const part4 = Math.abs(hash4).toString(16).padStart(16, '0');

    return part1 + part2 + part3 + part4;
  }
}

// Export singleton instance
const sessionHash = new SessionHash();

// Also export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = sessionHash;
}