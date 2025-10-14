/**
 * User Identity Management
 * Handles persistent user identification via UUID stored in cookies and localStorage
 */

const COOKIE_NAME = 'typeattack_uid';
const STORAGE_PREFIX = 'typeattack_';
const MAX_COOKIE_DATE = new Date('2038-01-19T03:14:07.000Z');

/**
 * Generate UUID v4
 * Uses crypto.randomUUID if available, falls back to manual generation
 */
function generateUUID() {
  // Try native crypto API first
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Set a cookie with the specified name, value, and expiration
 */
function setCookie(name, value, expires) {
  const cookieString = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  document.cookie = cookieString;
}

/**
 * Get a cookie value by name
 */
function getCookie(name) {
  const nameEQ = name + "=";
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length);
    }
  }

  return null;
}

/**
 * Delete a cookie by name
 */
function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Store user identity in localStorage as backup
 */
function backupToLocalStorage(uuid, initials) {
  try {
    localStorage.setItem(STORAGE_PREFIX + 'uid', uuid);
    localStorage.setItem(STORAGE_PREFIX + 'initials', initials);
    localStorage.setItem(STORAGE_PREFIX + 'created', Date.now().toString());
  } catch (e) {
    console.warn('Failed to backup user identity to localStorage:', e);
  }
}

/**
 * Restore user identity from localStorage if cookie is missing
 */
function restoreFromLocalStorage() {
  try {
    const uuid = localStorage.getItem(STORAGE_PREFIX + 'uid');
    const initials = localStorage.getItem(STORAGE_PREFIX + 'initials');
    const created = localStorage.getItem(STORAGE_PREFIX + 'created');

    if (uuid && initials) {
      return { uuid, initials, created: parseInt(created) || Date.now() };
    }
  } catch (e) {
    console.warn('Failed to restore user identity from localStorage:', e);
  }

  return null;
}

/**
 * UserIdentity class - manages persistent user identification
 */
class UserIdentity {
  constructor() {
    this.uuid = null;
    this.initials = null;
    this.created = null;
    this.loadIdentity();
  }

  /**
   * Load existing user identity from cookies or localStorage
   */
  loadIdentity() {
    // Try cookie first
    const cookieUuid = getCookie(COOKIE_NAME);

    if (cookieUuid) {
      this.uuid = cookieUuid;

      // Try to get initials from localStorage
      try {
        this.initials = localStorage.getItem(STORAGE_PREFIX + 'initials') || null;
        this.created = parseInt(localStorage.getItem(STORAGE_PREFIX + 'created')) || Date.now();
      } catch (e) {
        // localStorage might not be available
      }

      return true;
    }

    // Try localStorage backup
    const backup = restoreFromLocalStorage();

    if (backup) {
      this.uuid = backup.uuid;
      this.initials = backup.initials;
      this.created = backup.created;

      // Restore cookie
      setCookie(COOKIE_NAME, this.uuid, MAX_COOKIE_DATE);

      return true;
    }

    return false;
  }

  /**
   * Check if user has a valid identity
   */
  hasIdentity() {
    return this.uuid !== null;
  }

  /**
   * Create a new user identity with initials
   * @param {string} initials - 3 uppercase letters
   * @returns {Object} The created identity
   */
  createIdentity(initials) {
    // Validate initials
    if (!initials || !/^[A-Z]{3}$/.test(initials)) {
      throw new Error('Initials must be exactly 3 uppercase letters');
    }

    // Generate new UUID
    this.uuid = generateUUID();
    this.initials = initials;
    this.created = Date.now();

    // Store in cookie (primary)
    setCookie(COOKIE_NAME, this.uuid, MAX_COOKIE_DATE);

    // Backup to localStorage
    backupToLocalStorage(this.uuid, this.initials);

    return {
      uuid: this.uuid,
      initials: this.initials,
      created: this.created
    };
  }

  /**
   * Get current user identity
   */
  getIdentity() {
    if (!this.hasIdentity()) {
      return null;
    }

    return {
      uuid: this.uuid,
      initials: this.initials,
      created: this.created
    };
  }

  /**
   * Clear user identity (for testing or user request)
   */
  clearIdentity() {
    this.uuid = null;
    this.initials = null;
    this.created = null;

    // Clear cookie
    deleteCookie(COOKIE_NAME);

    // Clear localStorage backup
    try {
      localStorage.removeItem(STORAGE_PREFIX + 'uid');
      localStorage.removeItem(STORAGE_PREFIX + 'initials');
      localStorage.removeItem(STORAGE_PREFIX + 'created');
    } catch (e) {
      // localStorage might not be available
    }
  }

  /**
   * Update initials for existing identity
   * @param {string} initials - New 3 uppercase letters
   */
  updateInitials(initials) {
    if (!this.hasIdentity()) {
      throw new Error('No user identity exists');
    }

    if (!initials || !/^[A-Z]{3}$/.test(initials)) {
      throw new Error('Initials must be exactly 3 uppercase letters');
    }

    this.initials = initials;

    // Update localStorage backup
    try {
      localStorage.setItem(STORAGE_PREFIX + 'initials', initials);
    } catch (e) {
      console.warn('Failed to update initials in localStorage:', e);
    }

    return this.getIdentity();
  }
}

// Export singleton instance
const userIdentity = new UserIdentity();

// Also export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = userIdentity;
}