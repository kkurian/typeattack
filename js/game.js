/**
 * TypeAttack - Main Game Controller
 * Coordinates all game systems and manages game state
 */

class TypeAttackGame {
    constructor() {
        // Game state
        this.state = {
            currentLevel: null,
            isStarted: false,
            playerProgress: null
        };

        // Game systems
        this.gameLoop = null;
        this.keyboard = null;
        this.renderer = null;
        this.currentLevelInstance = null;
        this.attractMode = null;

        // Levels
        this.levels = {
            typing: null,
            vim: null,
            tmux: null
        };

        // Initialize
        this.init();
    }

    /**
     * Initialize game systems
     */
    async init() {
        Utils.log.info('Initializing TypeAttack...');

        // Initialize systems (but NOT renderer yet - it conflicts with attract mode)
        this.gameLoop = new GameLoop();
        this.keyboard = new KeyboardHandler();
        this.renderer = null; // Will be initialized when game starts

        // Load saved progress
        this.loadProgress();

        // Setup UI event handlers
        this.setupUI();

        // Setup control handlers (reserved for future use)
        this.setupControlHandlers();

        // Save progress before page unload
        window.addEventListener('beforeunload', () => {
            if (this.state.playerProgress) {
                this.saveProgress();
            }
        });

        // Handle mobile devices - hide button, show message
        const hasKeyboard = this.hasPhysicalKeyboard();
        console.log('=== INPUT CAPABILITY DETECTION DEBUG ===');
        console.log('User Agent:', navigator.userAgent);
        console.log('Platform:', navigator.platform);
        console.log('maxTouchPoints:', navigator.maxTouchPoints);
        console.log('Has Physical Keyboard?', hasKeyboard);

        if (!hasKeyboard) {
            console.log('No physical keyboard detected - hiding button, showing message');
            const startBtn = document.getElementById('start-button');
            const mobileMsg = document.getElementById('mobile-message');

            console.log('Start button found?', !!startBtn);
            console.log('Mobile message found?', !!mobileMsg);

            if (startBtn) {
                startBtn.style.display = 'none';
                // Also ensure visibility is hidden for mobile
                startBtn.style.visibility = 'hidden';
                console.log('Button hidden');
            }
            if (mobileMsg) {
                mobileMsg.style.display = 'block';
                console.log('Message shown');
            }
        } else {
            console.log('Keyboard detected - normal behavior');
        }

        // Start attract mode on the start screen
        this.attractMode = new AttractMode('game-canvas');
        this.attractMode.start();

        Utils.log.info('TypeAttack initialized');
    }

    /**
     * Load player progress from storage
     */
    loadProgress() {
        const savedState = window.StorageManager.load();

        if (savedState && savedState.playerProgress) {
            this.state.playerProgress = savedState.playerProgress;

            // Migration: Add stage tracking if it doesn't exist
            if (this.state.playerProgress.typingStage === undefined) {
                this.state.playerProgress.typingStage = 0;
            }
            if (this.state.playerProgress.vimStage === undefined) {
                this.state.playerProgress.vimStage = 0;
            }
            if (this.state.playerProgress.tmuxStage === undefined) {
                this.state.playerProgress.tmuxStage = 0;
            }

            Utils.log.info('Progress loaded from save');
        } else {
            // Create new player progress
            this.state.playerProgress = {
                id: Utils.generateId(),
                createdAt: Date.now(),
                lastPlayed: Date.now(),
                totalPlayTime: 0,

                // Proficiency scores (0-100)
                typingProficiency: 0,
                vimProficiency: 0,
                tmuxProficiency: 0,

                // Level unlock states
                typingUnlocked: true,  // Always unlocked
                vimUnlocked: false,     // Requires 80% typing
                tmuxUnlocked: false,    // Requires 80% vim

                // Current stage within each level
                typingStage: 0,
                vimStage: 0,
                tmuxStage: 0,

                // Statistics
                totalSessions: 0,
                totalChallenges: 0,
                recentChallenges: [],

                // Settings
                settings: {
                    soundEnabled: true,
                    soundVolume: 0.5,
                    showFPS: false
                }
            };
            Utils.log.info('Created new player progress');
        }

        // Apply settings
        this.applySettings();

        // Update progress display to show loaded proficiency
        this.updateProgressDisplay();
    }

    /**
     * Apply player settings
     */
    applySettings() {
        const settings = this.state.playerProgress.settings;

        // Apply sound settings
        window.AudioManager.setEnabled(settings.soundEnabled);
        window.AudioManager.setVolume(settings.soundVolume);

        // Apply FPS display
        this.gameLoop.showFPS(settings.showFPS);
    }

    /**
     * Setup UI event handlers
     */
    setupUI() {
        // Start button (only works on desktop - button hidden on mobile)
        const startBtn = document.getElementById('start-button');
        if (startBtn) {
            // Update button text based on saved progress
            const hasProgress = this.state.playerProgress &&
                              (this.state.playerProgress.typingStage > 0 ||
                               this.state.playerProgress.totalPlayTime > 0 ||
                               this.state.playerProgress.typingProficiency > 0);

            if (hasProgress) {
                startBtn.textContent = 'RESUME GAME';
            } else {
                startBtn.textContent = 'START GAME';
            }

            // Add visible class to trigger fade-in animation
            // Small delay to ensure DOM is ready and CSS animation works properly
            setTimeout(() => {
                startBtn.classList.add('visible');
            }, 100);

            startBtn.addEventListener('click', () => this.start());
        }

        // New Game link on start screen
        const newGameBtn = document.getElementById('new-game-button');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showResetModal();
            });
        }

        // Reset modal handlers
        const resetConfirm = document.getElementById('reset-confirm');
        if (resetConfirm) {
            resetConfirm.addEventListener('click', () => this.resetProgress());
        }

        const resetCancel = document.getElementById('reset-cancel');
        if (resetCancel) {
            resetCancel.addEventListener('click', () => this.hideResetModal());
        }
    }

    /**
     * Setup control handlers
     */
    setupControlHandlers() {
        // No keyboard shortcuts for game control to avoid interference with gameplay
        // All controls are mouse/click based
    }

    /**
     * Detect whether a physical keyboard is likely available.
     * Uses multiple heuristics to avoid false negatives on hybrid devices.
     * @returns {boolean}
     */
    hasPhysicalKeyboard() {
        const ua = navigator.userAgent || '';
        const uaData = navigator.userAgentData;
        const platform = (uaData && uaData.platform) || navigator.platform || '';

        const hasMatchMedia = typeof window.matchMedia === 'function';
        const pointerFine = hasMatchMedia ? window.matchMedia('(pointer: fine)').matches : false;
        const hoverCapable = hasMatchMedia ? window.matchMedia('(hover: hover)').matches : false;
        const pointerCoarse = hasMatchMedia ? window.matchMedia('(pointer: coarse)').matches : false;

        const maxTouchPoints = typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : 0;
        const hasTouch = ('ontouchstart' in window) || maxTouchPoints > 0;

        const desktopPlatforms = ['Win', 'Mac', 'Linux', 'CrOS', 'X11'];
        const isDesktopPlatform = desktopPlatforms.some(prefix => platform.indexOf(prefix) === 0);

        const phoneRegex = /Android.+Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet|PlayBook/i;

        if (uaData && typeof uaData.mobile === 'boolean') {
            if (!uaData.mobile) {
                return true;
            }

            if (uaData.mobile && (pointerFine || hoverCapable)) {
                return true;
            }
        }

        if (pointerFine || hoverCapable) {
            return true;
        }

        if (isDesktopPlatform) {
            return true;
        }

        if (/Mac/i.test(platform) && maxTouchPoints > 1) {
            return true;
        }

        if (!hasTouch) {
            return true;
        }

        if (tabletRegex.test(ua)) {
            return true;
        }

        if (pointerCoarse && phoneRegex.test(ua)) {
            return false;
        }

        if (uaData && typeof uaData.mobile === 'boolean' && uaData.mobile && phoneRegex.test(ua)) {
            return false;
        }

        return !phoneRegex.test(ua);
    }
    /**
     * Start the game
     */
    start() {
        if (this.state.isStarted) return;

        Utils.log.info('Starting game');

        // Stop attract mode
        if (this.attractMode) {
            this.attractMode.stop();
            this.attractMode = null; // Clean up
        }

        // Initialize renderer now that we're starting the game
        this.renderer = new Renderer('game-canvas');

        // Hide start screen
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.classList.add('hidden');
        }

        // Show top bar
        const topBar = document.getElementById('top-bar');
        if (topBar) {
            topBar.style.display = 'flex';
        }

        // Start with typing level
        this.loadLevel('typing');

        // Start game loop
        this.gameLoop.start(
            (deltaTime) => this.update(deltaTime),
            (interpolation) => this.render(interpolation)
        );

        // Enable keyboard
        this.keyboard.enable();

        this.state.isStarted = true;
        this.state.playerProgress.totalSessions++;

        // Save progress
        this.saveProgress();
    }

    /**
     * Load a game level
     * @param {string} levelName - Name of the level to load
     */
    loadLevel(levelName) {
        // Check if level is unlocked
        if (!this.isLevelUnlocked(levelName)) {
            Utils.log.warn(`Level ${levelName} is locked`);
            this.showLevelLockedMessage(levelName);
            return;
        }

        // Cleanup current level
        if (this.currentLevelInstance) {
            this.currentLevelInstance.destroy();
            this.currentLevelInstance = null;
        }

        // Hide vim and tmux containers (but keep canvas visible for typing level)
        document.getElementById('vim-editor').style.display = 'none';
        document.getElementById('tmux-panes').style.display = 'none';

        // Load new level
        switch (levelName) {
            case 'typing':
                // Canvas is always visible for typing level
                document.getElementById('game-canvas').style.display = 'block';
                if (!this.levels.typing) {
                    this.levels.typing = new TypingLevel(this);
                }
                this.currentLevelInstance = this.levels.typing;
                break;

            case 'vim':
                document.getElementById('vim-editor').style.display = 'block';
                if (!this.levels.vim) {
                    this.levels.vim = new VimLevel(this);
                }
                this.currentLevelInstance = this.levels.vim;
                break;

            case 'tmux':
                document.getElementById('tmux-panes').style.display = 'block';
                if (!this.levels.tmux) {
                    this.levels.tmux = new TmuxLevel(this);
                }
                this.currentLevelInstance = this.levels.tmux;
                break;

            default:
                Utils.log.error(`Unknown level: ${levelName}`);
                return;
        }

        this.state.currentLevel = levelName;

        if (this.currentLevelInstance) {
            this.currentLevelInstance.init();
        }

        this.updateProgressDisplay();
        Utils.log.info(`Loaded level: ${levelName}`);
    }

    /**
     * Check if a level is unlocked
     * @param {string} levelName
     * @returns {boolean}
     */
    isLevelUnlocked(levelName) {
        const progress = this.state.playerProgress;

        switch (levelName) {
            case 'typing':
                return true; // Always unlocked
            case 'vim':
                return progress.typingProficiency >= 80;
            case 'tmux':
                return progress.vimProficiency >= 80;
            default:
                return false;
        }
    }

    /**
     * Show level locked message
     * @param {string} levelName
     */
    showLevelLockedMessage(levelName) {
        let requirement = '';

        switch (levelName) {
            case 'vim':
                requirement = 'Achieve 80% proficiency in Typing level';
                break;
            case 'tmux':
                requirement = 'Achieve 80% proficiency in Vim level';
                break;
        }

        alert(`Level ${levelName} is locked!\n\nRequirement: ${requirement}`);
    }

    /**
     * Update game logic
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update current level
        if (this.currentLevelInstance && this.currentLevelInstance.update) {
            this.currentLevelInstance.update(deltaTime);
        }

        // Update play time
        this.state.playerProgress.totalPlayTime += deltaTime;
    }

    /**
     * Render the game
     * @param {number} interpolation - Interpolation factor for smooth rendering
     */
    render(interpolation) {
        // Only render if renderer exists (after game has started)
        if (!this.renderer) return;

        // Clear canvas
        this.renderer.clear();

        // Render current level
        if (this.currentLevelInstance && this.currentLevelInstance.render) {
            this.currentLevelInstance.render(this.renderer, interpolation);
        }
    }

    /**
     * Restart current level
     */
    restartLevel() {
        if (this.currentLevelInstance && this.currentLevelInstance.restart) {
            this.currentLevelInstance.restart();
            Utils.log.info('Level restarted');
        }
    }

    /**
     * Show main menu
     */
    showMenu() {
        // For now, just reload the page to return to start
        if (confirm('Return to main menu? (Progress will be saved)')) {
            this.saveProgress();
            location.reload();
        }
    }

    /**
     * Show reset confirmation modal
     */
    showResetModal() {
        const modal = document.getElementById('reset-modal');
        if (modal) {
            // Remove any existing animation classes
            modal.classList.remove('fade-in', 'fade-out');

            // Show the modal
            modal.style.display = 'flex';

            // Force a reflow to ensure the display change is processed
            void modal.offsetHeight;

            // Add fade-in class to trigger animation
            modal.classList.add('fade-in');
        }
    }

    /**
     * Hide reset confirmation modal
     */
    hideResetModal() {
        const modal = document.getElementById('reset-modal');
        if (modal) {
            // Remove fade-in and add fade-out class
            modal.classList.remove('fade-in');
            modal.classList.add('fade-out');

            // Wait for animation to complete before hiding
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('fade-out');
            }, 300); // Match animation duration
        }
    }

    /**
     * Reset all progress
     */
    resetProgress() {
        // Clear saved data
        window.StorageManager.clear();

        // Clear instruction flags
        localStorage.removeItem('typeattack_has_played');

        // Create fresh progress
        this.state.playerProgress = {
            id: Utils.generateId(),
            createdAt: Date.now(),
            lastPlayed: Date.now(),
            totalPlayTime: 0,
            typingProficiency: 0,
            vimProficiency: 0,
            tmuxProficiency: 0,
            typingUnlocked: true,
            vimUnlocked: false,
            tmuxUnlocked: false,
            typingStage: 0,
            vimStage: 0,
            tmuxStage: 0,
            totalSessions: 0,
            totalChallenges: 0,
            recentChallenges: [],
            settings: {
                soundEnabled: true,
                soundVolume: 0.5,
                showFPS: false
            }
        };

        // Hide modal with animation
        const modal = document.getElementById('reset-modal');
        if (modal) {
            modal.classList.add('fade-out');

            // Wait for animation then reload
            setTimeout(() => {
                location.reload();
            }, 300);
        } else {
            // Fallback if modal not found
            location.reload();
        }
    }

    /**
     * Update proficiency score for a level
     * @param {string} levelName
     * @param {number} proficiency - New proficiency score (0-100)
     */
    updateProficiency(levelName, proficiency) {
        const oldProficiency = this.state.playerProgress[`${levelName}Proficiency`];
        this.state.playerProgress[`${levelName}Proficiency`] = proficiency;

        // Check for level unlocks
        if (levelName === 'typing' && proficiency >= 80 && !this.state.playerProgress.vimUnlocked) {
            this.state.playerProgress.vimUnlocked = true;
            this.showUnlockNotification('Vim');
        } else if (levelName === 'vim' && proficiency >= 80 && !this.state.playerProgress.tmuxUnlocked) {
            this.state.playerProgress.tmuxUnlocked = true;
            this.showUnlockNotification('Tmux');
        }

        // Update display
        this.updateProgressDisplay();

        // Save progress
        this.saveProgress();
    }

    /**
     * Show unlock notification
     * @param {string} levelName
     */
    showUnlockNotification(levelName) {
        Utils.log.info(`Level unlocked: ${levelName}`);

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'achievement';
        notification.innerHTML = `
            <h2>LEVEL UNLOCKED!</h2>
            <p>${levelName.toUpperCase()} mode is now available</p>
        `;
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);

        // Play success sound
        window.AudioManager.playLevelComplete();
    }

    /**
     * Update progress display
     */
    updateProgressDisplay() {
        const progress = this.state.playerProgress;

        // Update typing level
        const typingLevel = document.getElementById('typing-level');
        if (typingLevel) {
            const fill = typingLevel.querySelector('.level-fill');
            if (fill) {
                fill.style.width = `${progress.typingProficiency}%`;
            }
        }

        // Update vim level
        const vimLevel = document.getElementById('vim-level');
        if (vimLevel) {
            if (progress.vimUnlocked) {
                vimLevel.classList.remove('locked');
                const fill = vimLevel.querySelector('.level-fill');
                if (fill) {
                    fill.style.width = `${progress.vimProficiency}%`;
                }
            }
        }

        // Update tmux level
        const tmuxLevel = document.getElementById('tmux-level');
        if (tmuxLevel) {
            if (progress.tmuxUnlocked) {
                tmuxLevel.classList.remove('locked');
                const fill = tmuxLevel.querySelector('.level-fill');
                if (fill) {
                    fill.style.width = `${progress.tmuxProficiency}%`;
                }
            }
        }
    }

    /**
     * Save progress to storage
     */
    saveProgress() {
        const saveData = {
            playerProgress: this.state.playerProgress,
            timestamp: Date.now()
        };

        window.StorageManager.save(saveData);
    }

    /**
     * Get current game state
     * @returns {Object}
     */
    getState() {
        return {
            playerProgress: this.state.playerProgress,
            currentLevel: this.state.currentLevel
        };
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        if (this.gameLoop) {
            this.gameLoop.destroy();
        }
        if (this.keyboard) {
            this.keyboard.destroy();
        }
        if (this.renderer) {
            this.renderer.destroy();
        }
        if (this.currentLevelInstance) {
            this.currentLevelInstance.destroy();
        }
        if (this.attractMode) {
            this.attractMode.stop();
        }

        // Stop auto-save
        window.StorageManager.stopAutoSave();
    }
}

// Make game globally accessible
window.TypeAttackGame = TypeAttackGame;
