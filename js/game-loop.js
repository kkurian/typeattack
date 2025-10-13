/**
 * TypeAttack - Game Loop Engine
 * Fixed timestep update with variable rendering and auto-pause
 */

class GameLoop {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;

        // Timing configuration
        this.targetFPS = 60;
        this.targetFrameTime = 1000 / this.targetFPS; // 16.67ms for 60 FPS
        this.maxFrameTime = 100; // Max frame time to prevent spiral of death

        // Timing state
        this.lastTime = 0;
        this.accumulator = 0;
        this.frameCount = 0;
        this.fpsUpdateTime = 0;
        this.currentFPS = 60;

        // Callbacks
        this.updateCallback = null;
        this.renderCallback = null;

        // Bind methods
        this.loop = this.loop.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

        // Setup page visibility handling for auto-pause
        this.setupVisibilityHandling();
    }

    /**
     * Setup page visibility API for auto-pause
     */
    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('blur', () => this.handleFocusChange(false));
        window.addEventListener('focus', () => this.handleFocusChange(true));
    }

    /**
     * Handle page visibility changes
     */
    handleVisibilityChange() {
        if (document.hidden && this.isRunning && !this.isPaused) {
            this.pause();
            this.wasAutoPaused = true;
            Utils.log.debug('Game auto-paused due to tab visibility');
        } else if (!document.hidden && this.wasAutoPaused) {
            // Don't auto-resume - let user manually resume
            Utils.log.debug('Tab visible again, waiting for user to resume');
        }
    }

    /**
     * Handle window focus changes
     * @param {boolean} hasFocus - Whether window has focus
     */
    handleFocusChange(hasFocus) {
        if (!hasFocus && this.isRunning && !this.isPaused) {
            this.pause();
            this.wasAutoPaused = true;
            Utils.log.debug('Game auto-paused due to window blur');
        }
    }

    /**
     * Start the game loop
     * @param {Function} updateCallback - Fixed timestep update function
     * @param {Function} renderCallback - Variable rate render function
     */
    start(updateCallback, renderCallback) {
        if (this.isRunning) {
            Utils.log.warn('Game loop already running');
            return;
        }

        this.updateCallback = updateCallback;
        this.renderCallback = renderCallback;
        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        this.accumulator = 0;

        Utils.log.info('Game loop started');
        requestAnimationFrame(this.loop);
    }

    /**
     * Stop the game loop completely
     */
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        Utils.log.info('Game loop stopped');
    }

    /**
     * Pause the game loop
     */
    pause() {
        if (!this.isRunning) return;

        this.isPaused = true;
        this.showPauseIndicator(true);

        // Update pause button text
        const pauseBtn = document.getElementById('pause-button');
        if (pauseBtn) {
            pauseBtn.textContent = 'RESUME';
        }

        Utils.log.debug('Game paused');
    }

    /**
     * Resume the game loop
     */
    resume() {
        if (!this.isRunning) return;

        this.isPaused = false;
        this.wasAutoPaused = false;
        this.lastTime = performance.now(); // Reset time to prevent huge delta
        this.accumulator = 0;
        this.showPauseIndicator(false);

        // Update pause button text
        const pauseBtn = document.getElementById('pause-button');
        if (pauseBtn) {
            pauseBtn.textContent = 'PAUSE';
        }

        Utils.log.debug('Game resumed');
        requestAnimationFrame(this.loop);
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**
     * Main game loop
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     */
    loop(currentTime) {
        if (!this.isRunning) return;
        if (this.isPaused) return;

        // Calculate delta time and cap it
        const deltaTime = Math.min(currentTime - this.lastTime, this.maxFrameTime);
        this.lastTime = currentTime;

        // Add to accumulator for fixed timestep
        this.accumulator += deltaTime;

        // Fixed timestep updates
        let updateCount = 0;
        while (this.accumulator >= this.targetFrameTime) {
            if (this.updateCallback) {
                this.updateCallback(this.targetFrameTime / 1000); // Pass delta in seconds
            }
            this.accumulator -= this.targetFrameTime;
            updateCount++;

            // Prevent spiral of death - max 5 updates per frame
            if (updateCount >= 5) {
                this.accumulator = 0;
                break;
            }
        }

        // Variable rate rendering with interpolation
        const interpolation = this.accumulator / this.targetFrameTime;
        if (this.renderCallback) {
            this.renderCallback(interpolation);
        }

        // Update FPS counter
        this.updateFPS(currentTime);

        // Continue loop
        requestAnimationFrame(this.loop);
    }

    /**
     * Update FPS counter
     * @param {number} currentTime - Current timestamp
     */
    updateFPS(currentTime) {
        this.frameCount++;

        // Update FPS display every second
        if (currentTime - this.fpsUpdateTime >= 1000) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;

            // Update FPS display
            const fpsElement = document.getElementById('fps-counter');
            if (fpsElement) {
                fpsElement.textContent = `${this.currentFPS} FPS`;

                // Color code FPS
                if (this.currentFPS >= 55) {
                    fpsElement.style.color = '#0f0'; // Green for good
                } else if (this.currentFPS >= 30) {
                    fpsElement.style.color = '#ff0'; // Yellow for acceptable
                } else {
                    fpsElement.style.color = '#f00'; // Red for poor
                }
            }
        }
    }

    /**
     * Show or hide pause indicator
     * @param {boolean} show - Whether to show the indicator
     */
    showPauseIndicator(show) {
        const indicator = document.getElementById('pause-indicator');
        if (indicator) {
            indicator.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Get current FPS
     * @returns {number} Current FPS
     */
    getFPS() {
        return this.currentFPS;
    }

    /**
     * Get timing statistics
     * @returns {Object} Timing stats
     */
    getStats() {
        return {
            fps: this.currentFPS,
            targetFPS: this.targetFPS,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            frameTime: this.targetFrameTime
        };
    }

    /**
     * Set target FPS
     * @param {number} fps - Target frames per second
     */
    setTargetFPS(fps) {
        this.targetFPS = fps;
        this.targetFrameTime = 1000 / fps;
        Utils.log.info(`Target FPS set to ${fps}`);
    }

    /**
     * Enable or disable FPS display
     * @param {boolean} show - Whether to show FPS
     */
    showFPS(show) {
        const fpsElement = document.getElementById('fps-counter');
        if (fpsElement) {
            fpsElement.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.stop();
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('blur', () => this.handleFocusChange(false));
        window.removeEventListener('focus', () => this.handleFocusChange(true));
    }
}

// Export for use in other modules
window.GameLoop = GameLoop;