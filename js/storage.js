/**
 * TypeAttack - Storage Manager Module
 * Handles localStorage persistence with version management and auto-save
 */

class StorageManager {
    constructor() {
        this.STORAGE_KEY = 'typeattack_save';
        this.STORAGE_VERSION = '1.0.0';
        this.autoSaveInterval = null;
        this.isAvailable = this.checkAvailability();
        this.quotaExceeded = false;

        // Initialize auto-save
        this.startAutoSave();

        // Check storage on initialization
        if (!this.isAvailable) {
            this.showStorageWarning('localStorage is not available. Progress will not be saved.');
        }
    }

    /**
     * Check if localStorage is available and working
     * @returns {boolean} Whether localStorage is available
     */
    checkAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Save game state to localStorage
     * @param {Object} gameState - The complete game state to save
     * @returns {boolean} Whether save was successful
     */
    save(gameState) {
        if (!this.isAvailable) {
            Utils.log.warn('Storage not available, cannot save');
            return false;
        }

        try {
            const saveData = {
                version: this.STORAGE_VERSION,
                timestamp: Date.now(),
                gameState: gameState
            };

            const serialized = JSON.stringify(saveData);

            // Check size (localStorage typically has 5-10MB limit)
            const sizeInMB = new Blob([serialized]).size / (1024 * 1024);
            if (sizeInMB > 2) {
                Utils.log.warn(`Save data is ${sizeInMB.toFixed(2)}MB, approaching storage limit`);
            }

            localStorage.setItem(this.STORAGE_KEY, serialized);
            this.quotaExceeded = false;
            Utils.log.debug('Game saved successfully');
            return true;

        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                this.handleQuotaExceeded();
            } else {
                Utils.log.error('Failed to save game:', e);
            }
            return false;
        }
    }

    /**
     * Load game state from localStorage
     * @returns {Object|null} Loaded game state or null if not found/error
     */
    load() {
        if (!this.isAvailable) {
            Utils.log.warn('Storage not available, cannot load');
            return null;
        }

        try {
            const serialized = localStorage.getItem(this.STORAGE_KEY);
            if (!serialized) {
                Utils.log.info('No save data found');
                return null;
            }

            const saveData = JSON.parse(serialized);

            // Version check
            if (saveData.version !== this.STORAGE_VERSION) {
                Utils.log.info(`Save version mismatch: ${saveData.version} vs ${this.STORAGE_VERSION}`);
                // Attempt migration if needed
                return this.migrate(saveData);
            }

            Utils.log.debug('Game loaded successfully');
            return saveData.gameState;

        } catch (e) {
            Utils.log.error('Failed to load game:', e);
            // Corrupted save data - back it up and start fresh
            this.backupCorruptedSave();
            return null;
        }
    }

    /**
     * Delete save data
     * @returns {boolean} Whether deletion was successful
     */
    deleteSave() {
        if (!this.isAvailable) {
            return false;
        }

        try {
            localStorage.removeItem(this.STORAGE_KEY);
            Utils.log.info('Save data deleted');
            return true;
        } catch (e) {
            Utils.log.error('Failed to delete save:', e);
            return false;
        }
    }

    /**
     * Start auto-save timer (30 second interval)
     */
    startAutoSave() {
        // Clear existing interval if any
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        // Set up new auto-save interval (30 seconds)
        this.autoSaveInterval = setInterval(() => {
            if (window.game && window.game.getState) {
                const state = window.game.getState();
                if (state) {
                    this.save(state);
                }
            }
        }, 30000); // 30 seconds

        Utils.log.debug('Auto-save started (30s interval)');
    }

    /**
     * Stop auto-save timer
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            Utils.log.debug('Auto-save stopped');
        }
    }

    /**
     * Handle quota exceeded error
     */
    handleQuotaExceeded() {
        this.quotaExceeded = true;
        this.showStorageWarning('Storage quota exceeded! Progress cannot be saved. Clear browser data to fix.');

        // Try to clear old data if possible
        this.clearOldData();
    }

    /**
     * Show storage warning to user
     * @param {string} message - Warning message
     */
    showStorageWarning(message) {
        const warning = document.getElementById('storage-warning');
        if (warning) {
            warning.textContent = '⚠️ ' + message;
            warning.style.display = 'block';
        }
        Utils.log.warn('Storage warning:', message);
    }

    /**
     * Hide storage warning
     */
    hideStorageWarning() {
        const warning = document.getElementById('storage-warning');
        if (warning) {
            warning.style.display = 'none';
        }
    }

    /**
     * Migrate save data from older versions
     * @param {Object} oldSaveData - Old format save data
     * @returns {Object|null} Migrated game state or null if migration fails
     */
    migrate(oldSaveData) {
        try {
            // Handle migration based on version
            const oldVersion = oldSaveData.version || '0.0.0';
            let gameState = oldSaveData.gameState || oldSaveData;

            // Add migration logic for different versions here
            // For now, just return the game state as-is
            Utils.log.info(`Migrated save from version ${oldVersion} to ${this.STORAGE_VERSION}`);
            return gameState;

        } catch (e) {
            Utils.log.error('Migration failed:', e);
            return null;
        }
    }

    /**
     * Back up corrupted save data
     */
    backupCorruptedSave() {
        try {
            const corrupted = localStorage.getItem(this.STORAGE_KEY);
            if (corrupted) {
                const backupKey = `${this.STORAGE_KEY}_backup_${Date.now()}`;
                localStorage.setItem(backupKey, corrupted);
                localStorage.removeItem(this.STORAGE_KEY);
                Utils.log.info('Corrupted save backed up to', backupKey);
            }
        } catch (e) {
            Utils.log.error('Failed to backup corrupted save:', e);
        }
    }

    /**
     * Clear old backup data to free up space
     */
    clearOldData() {
        try {
            const keys = Object.keys(localStorage);
            const backupPattern = new RegExp(`^${this.STORAGE_KEY}_backup_`);
            let cleared = 0;

            keys.forEach(key => {
                if (backupPattern.test(key)) {
                    localStorage.removeItem(key);
                    cleared++;
                }
            });

            if (cleared > 0) {
                Utils.log.info(`Cleared ${cleared} old backup(s) to free space`);
            }
        } catch (e) {
            Utils.log.error('Failed to clear old data:', e);
        }
    }

    /**
     * Get storage usage info
     * @returns {Object} Storage usage statistics
     */
    getStorageInfo() {
        if (!this.isAvailable) {
            return {
                available: false,
                used: 0,
                items: 0
            };
        }

        try {
            let totalSize = 0;
            let items = 0;

            for (const key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                    items++;
                }
            }

            return {
                available: true,
                used: totalSize,
                usedMB: (totalSize / (1024 * 1024)).toFixed(2),
                items: items,
                quotaExceeded: this.quotaExceeded
            };
        } catch (e) {
            Utils.log.error('Failed to get storage info:', e);
            return {
                available: false,
                error: e.message
            };
        }
    }

    /**
     * Export save data as JSON string
     * @returns {string|null} JSON string of save data
     */
    exportSave() {
        const saveData = this.load();
        if (saveData) {
            return JSON.stringify(saveData, null, 2);
        }
        return null;
    }

    /**
     * Import save data from JSON string
     * @param {string} jsonString - JSON string to import
     * @returns {boolean} Whether import was successful
     */
    importSave(jsonString) {
        try {
            const gameState = JSON.parse(jsonString);
            return this.save(gameState);
        } catch (e) {
            Utils.log.error('Failed to import save:', e);
            return false;
        }
    }
}

// Create global storage manager instance
window.StorageManager = new StorageManager();