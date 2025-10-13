/**
 * TypeAttack - Keyboard Input Handler
 * Captures keyboard input with error cooldown and layout validation
 */

class KeyboardHandler {
    constructor() {
        // Input state
        this.enabled = false;
        this.currentKey = null;
        this.keysPressed = new Set();

        // Error tracking (no cooldown)
        this.consecutiveErrors = 0;

        // Keyboard layout detection
        this.keyboardLayout = 'QWERTY'; // Default assumption
        this.layoutWarningShown = false;

        // Event listeners
        this.listeners = new Map();

        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);

        // Initialize
        this.init();
    }

    /**
     * Initialize keyboard handler
     */
    init() {
        // Setup event listeners
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);

        // Detect keyboard layout
        this.detectKeyboardLayout();

        // Ensure game container can receive focus
        const container = document.getElementById('game-container');
        if (container) {
            container.tabIndex = 0;
        }

        Utils.log.debug('Keyboard handler initialized');
    }

    /**
     * Enable keyboard input
     */
    enable() {
        this.enabled = true;
        this.focusGameContainer();
        Utils.log.debug('Keyboard input enabled');
    }

    /**
     * Disable keyboard input
     */
    disable() {
        this.enabled = false;
        this.keysPressed.clear();
        Utils.log.debug('Keyboard input disabled');
    }

    /**
     * Focus the game container
     */
    focusGameContainer() {
        const container = document.getElementById('game-container');
        if (container) {
            container.focus();
        }
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} event
     */
    handleKeyDown(event) {
        // Don't process if disabled
        if (!this.enabled) {
            return;
        }

        // Don't process if typing in an input field
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        // Prevent default for game keys
        if (this.isGameKey(event.key)) {
            event.preventDefault();
        }

        // Track key state
        this.keysPressed.add(event.key);
        this.currentKey = event.key;

        // Dispatch to listeners
        this.dispatch('keydown', {
            key: event.key,
            code: event.code,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        });
    }

    /**
     * Handle keyup events
     * @param {KeyboardEvent} event
     */
    handleKeyUp(event) {
        // Remove from pressed keys
        this.keysPressed.delete(event.key);

        // Clear current key if it matches
        if (this.currentKey === event.key) {
            this.currentKey = null;
        }

        // Dispatch to listeners (even if disabled for cleanup)
        this.dispatch('keyup', {
            key: event.key,
            code: event.code
        });
    }

    /**
     * Check if a key is a game key (should prevent default)
     * @param {string} key
     * @returns {boolean}
     */
    isGameKey(key) {
        // All letter keys, numbers, space, and common punctuation
        return /^[a-zA-Z0-9 .,;:!?'"()\-]$/.test(key) ||
               key === 'Backspace' ||
               key === 'Enter' ||
               key === 'Tab';
    }

    /**
     * Register incorrect keystroke
     */
    registerError() {
        this.consecutiveErrors++;

        // Dispatch error event
        this.dispatch('error', {
            count: this.consecutiveErrors
        });
    }

    /**
     * Register correct keystroke
     */
    registerCorrect() {
        // Reset consecutive error count on correct input
        this.consecutiveErrors = 0;

        // Dispatch correct event
        this.dispatch('correct', {});
    }


    /**
     * Detect keyboard layout using the Keyboard API
     */
    async detectKeyboardLayout() {
        try {
            // Check if Keyboard API is available
            if ('keyboard' in navigator && 'getLayoutMap' in navigator.keyboard) {
                const layoutMap = await navigator.keyboard.getLayoutMap();

                // Check if Q key is in expected position for QWERTY
                const qKey = layoutMap.get('KeyQ');
                if (qKey && qKey.toLowerCase() === 'q') {
                    this.keyboardLayout = 'QWERTY';
                } else {
                    this.keyboardLayout = 'non-QWERTY';
                    this.showLayoutWarning();
                }
            } else {
                // Keyboard API not available, assume QWERTY
                Utils.log.debug('Keyboard API not available, assuming QWERTY layout');
            }
        } catch (error) {
            Utils.log.warn('Could not detect keyboard layout:', error);
        }
    }

    /**
     * Show keyboard layout warning
     */
    showLayoutWarning() {
        if (!this.layoutWarningShown) {
            this.layoutWarningShown = true;
            console.warn('Non-QWERTY keyboard layout detected. Game is optimized for QWERTY.');

            // Could show a visual warning to the user
            const warning = document.createElement('div');
            warning.textContent = 'Warning: Non-QWERTY keyboard detected. Game works best with QWERTY layout.';
            warning.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #000;
                color: #ff0;
                border: 2px solid #ff0;
                padding: 20px;
                z-index: 10000;
            `;
            document.body.appendChild(warning);

            // Remove warning after 5 seconds
            setTimeout(() => {
                warning.remove();
            }, 5000);
        }
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Dispatch event to listeners
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    dispatch(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                callback(data);
            });
        }
    }

    /**
     * Check if a key is currently pressed
     * @param {string} key
     * @returns {boolean}
     */
    isKeyPressed(key) {
        return this.keysPressed.has(key);
    }

    /**
     * Check if any modifier keys are pressed
     * @returns {Object}
     */
    getModifierState() {
        return {
            shift: this.isKeyPressed('Shift'),
            ctrl: this.isKeyPressed('Control'),
            alt: this.isKeyPressed('Alt'),
            meta: this.isKeyPressed('Meta')
        };
    }

    /**
     * Get keyboard layout
     * @returns {string}
     */
    getLayout() {
        return this.keyboardLayout;
    }

    /**
     * Reset error count
     */
    resetErrors() {
        this.consecutiveErrors = 0;
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        this.listeners.clear();
        this.keysPressed.clear();
    }
}

// Export for use in other modules
window.KeyboardHandler = KeyboardHandler;