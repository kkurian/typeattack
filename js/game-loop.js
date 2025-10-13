/**
 * TypeAttack - Game Loop Engine
 * Fixed timestep update with variable rendering
 */

class GameLoop {
    constructor() {
        this.isRunning = false;

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
        Utils.log.info('Game loop stopped');
    }

    /**
     * Main game loop
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     */
    loop(currentTime) {
        if (!this.isRunning) return;

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
    }
}

// Export for use in other modules
window.GameLoop = GameLoop;
