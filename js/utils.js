/**
 * TypeAttack - Utility Functions Module
 * General purpose helper functions used throughout the game
 */

const Utils = {
    /**
     * Generate a unique ID
     * @returns {string} Unique identifier
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Get current timestamp in milliseconds
     * @returns {number} Current timestamp
     */
    timestamp() {
        return Date.now();
    },

    /**
     * Get high-precision timestamp for animation
     * @returns {number} High precision timestamp
     */
    now() {
        return performance.now();
    },

    /**
     * Shuffle an array in place (Fisher-Yates)
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array (same reference)
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    /**
     * Get random element from array
     * @param {Array} array - Source array
     * @returns {*} Random element
     */
    randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Linear interpolation
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Map a value from one range to another
     * @param {number} value - Input value
     * @param {number} inMin - Input minimum
     * @param {number} inMax - Input maximum
     * @param {number} outMin - Output minimum
     * @param {number} outMax - Output maximum
     * @returns {number} Mapped value
     */
    mapRange(value, inMin, inMax, outMin, outMax) {
        return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
    },

    /**
     * Format time in MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Calculate words per minute
     * @param {number} characters - Number of characters typed
     * @param {number} seconds - Time taken in seconds
     * @returns {number} Words per minute (assuming 5 chars per word)
     */
    calculateWPM(characters, seconds) {
        if (seconds === 0) return 0;
        return Math.round((characters / 5) / (seconds / 60));
    },

    /**
     * Calculate accuracy percentage
     * @param {number} correct - Correct keystrokes
     * @param {number} total - Total keystrokes
     * @returns {number} Accuracy percentage (0-100)
     */
    calculateAccuracy(correct, total) {
        if (total === 0) return 100;
        return Math.round((correct / total) * 100);
    },

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} limit - Minimum time between executions
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Deep clone an object (simple implementation)
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    },

    /**
     * Check if browser supports a feature
     * @param {string} feature - Feature to check
     * @returns {boolean} Whether feature is supported
     */
    isSupported(feature) {
        const features = {
            localStorage: () => {
                try {
                    const test = '__test__';
                    localStorage.setItem(test, test);
                    localStorage.removeItem(test);
                    return true;
                } catch (e) {
                    return false;
                }
            },
            webAudio: () => 'AudioContext' in window || 'webkitAudioContext' in window,
            canvas: () => !!document.createElement('canvas').getContext,
            requestAnimationFrame: () => 'requestAnimationFrame' in window
        };

        return features[feature] ? features[feature]() : false;
    },

    /**
     * Get browser info
     * @returns {Object} Browser information
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browserName = 'Unknown';
        let version = 'Unknown';

        if (ua.indexOf('Chrome') > -1) {
            browserName = 'Chrome';
            version = ua.match(/Chrome\/(\d+)/)[1];
        } else if (ua.indexOf('Safari') > -1) {
            browserName = 'Safari';
            version = ua.match(/Version\/(\d+)/)[1];
        } else if (ua.indexOf('Firefox') > -1) {
            browserName = 'Firefox';
            version = ua.match(/Firefox\/(\d+)/)[1];
        }

        return { browserName, version, userAgent: ua };
    },

    /**
     * Logging utilities
     */
    log: {
        debug(...args) {
            if (window.DEBUG_MODE) {
                console.log('[DEBUG]', ...args);
            }
        },
        info(...args) {
            console.log('[INFO]', ...args);
        },
        warn(...args) {
            console.warn('[WARN]', ...args);
        },
        error(...args) {
            console.error('[ERROR]', ...args);
        }
    },

    /**
     * Create an enum-like object
     * @param {...string} keys - Enum keys
     * @returns {Object} Frozen object with enum values
     */
    createEnum(...keys) {
        const obj = {};
        keys.forEach(key => {
            obj[key] = key;
        });
        return Object.freeze(obj);
    },

    /**
     * Wait for a specified duration
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Load an image
     * @param {string} src - Image source URL
     * @returns {Promise<Image>} Promise that resolves with loaded image
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    },

    /**
     * Get URL parameters
     * @returns {Object} URL parameters as key-value pairs
     */
    getUrlParams() {
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams) {
            params[key] = value;
        }
        return params;
    },

    /**
     * Check if running on localhost
     * @returns {boolean} True if localhost
     */
    isLocalhost() {
        return window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname === '';
    }
};

// Enable debug mode in development
window.DEBUG_MODE = Utils.isLocalhost();

// Export for use in other modules
window.Utils = Utils;