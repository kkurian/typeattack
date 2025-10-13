/**
 * TypeAttack - Version Check System
 * Monitors for updates and shows notification instead of auto-reloading
 */

class VersionChecker {
    constructor() {
        this.currentVersion = null;
        this.checkInterval = 60000; // Check every minute
        this.intervalId = null;
        this.updateAvailable = false;

        // Get initial version
        this.initVersion();
    }

    /**
     * Initialize version tracking
     */
    async initVersion() {
        try {
            // Fetch initial version info from the page headers
            const response = await fetch(window.location.href, {
                method: 'HEAD',
                cache: 'no-cache'
            });

            const lastModified = response.headers.get('last-modified');
            const etag = response.headers.get('etag');
            this.currentVersion = `${lastModified}-${etag}`;

            // Store in session storage for comparison
            if (!sessionStorage.getItem('typeattack_version')) {
                sessionStorage.setItem('typeattack_version', this.currentVersion);
            }

            Utils.log.debug(`Version initialized: ${this.currentVersion}`);
        } catch (error) {
            Utils.log.warn('Could not initialize version:', error);
            // Fall back to a static version
            this.currentVersion = 'v1.0.0';
            if (!sessionStorage.getItem('typeattack_version')) {
                sessionStorage.setItem('typeattack_version', this.currentVersion);
            }
        }

        // Start checking for updates
        this.startChecking();
    }


    /**
     * Start periodic version checking
     */
    startChecking() {
        // Clear any existing interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        // Check periodically
        this.intervalId = setInterval(() => {
            this.checkForUpdate();
        }, this.checkInterval);
    }

    /**
     * Stop version checking
     */
    stopChecking() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Check if a new version is available
     */
    async checkForUpdate() {
        try {
            // In production, this would fetch version info from server
            // For demo, we'll simulate by checking if HTML has changed
            const response = await fetch(window.location.href, {
                method: 'HEAD',
                cache: 'no-cache'
            });

            const lastModified = response.headers.get('last-modified');
            const etag = response.headers.get('etag');

            // Check if version has changed
            const storedVersion = sessionStorage.getItem('typeattack_version');
            const currentCheck = `${lastModified}-${etag}`;

            if (storedVersion && storedVersion !== currentCheck && !this.updateAvailable) {
                this.updateAvailable = true;
                this.showUpdateNotification();
                Utils.log.info('New version available');
            }
        } catch (error) {
            // Silently fail - don't disrupt gameplay
            Utils.log.debug('Version check failed:', error);
        }
    }

    /**
     * Show update notification to user
     */
    showUpdateNotification() {
        // Don't show if notification already exists
        if (document.getElementById('update-notification')) {
            return;
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.id = 'update-notification';
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <span class="update-icon">▲</span>
                <span class="update-text">Update available</span>
                <button class="update-button" onclick="window.versionChecker.applyUpdate()">UPDATE</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
    }

    /**
     * Apply the update (reload the page)
     */
    applyUpdate() {
        // Save current game state before reloading
        if (window.game && window.game.saveProgress) {
            window.game.saveProgress();
        }

        // Clear version cache
        sessionStorage.removeItem('typeattack_version');

        // Reload with cache bypass
        window.location.reload(true);
    }

    // Dismiss functionality removed - users must update when notification appears

    /**
     * Force check for updates (for testing)
     */
    forceCheck() {
        this.checkForUpdate();
    }
}

// Create global version checker instance
window.VersionChecker = VersionChecker;