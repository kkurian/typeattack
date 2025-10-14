/**
 * TypeAttack - Typing Level Implementation
 * Horizontal scrolling typing game with progressive difficulty
 */

class TypingLevel {
    constructor(game) {
        this.game = game;

        // Level state
        this.words = [];
        this.activeWordIndex = -1;
        this.typedText = '';
        this.score = 0;
        this.streak = 0;
        this.comboMultiplier = 1;
        this.hotStreakCounter = 0; // Counts consecutive correct keystrokes
        this.hotStreakActive = false;
        this.hotStreakMusicStop = null; // Function to stop hot streak music
        this.hotStreakStartTime = 0;
        this.hotStreakBonus = 0; // Accumulated bonus points during hot streak
        this.hotStreakBonusAnimation = null; // Animation when bonus is awarded
        this.hotStreakMultiplierDisplay = null; // Display when multiplier changes
        this.lastHotStreakMultiplier = 1; // Track last multiplier to detect changes

        // Timing
        this.spawnTimer = 0;
        // Dynamic base spawn interval based on whether we're in letter or word stages
        this.isLetterStage = () => this.currentStage < 10;
        this.baseSpawnInterval = this.isLetterStage() ? 1.2 : 2.0; // Faster for letters
        this.spawnInterval = this.baseSpawnInterval;
        this.minSpawnInterval = this.isLetterStage() ? 0.5 : 0.8; // Faster for letters
        this.baseSpeed = 40; // pixels per second (slower start)
        this.currentSpeed = this.baseSpeed;

        // Dynamic spawn rate based on typing speed
        this.recentTypingSpeed = 0; // Characters per second
        this.adaptiveSpawnTimer = 0;


        // Statistics
        this.totalKeystrokes = 0;
        this.correctKeystrokes = 0;
        this.startTime = 0;
        this.charactersTyped = 0;
        this.wordsCompleted = 0;
        this.wordsMissed = 0; // Track how many words reached the edge
        this.maxWordsMissed = 10; // Game over after missing 10 words

        // Proficiency tracking
        this.wpmHistory = [];
        this.accuracyHistory = [];
        this.proficiencyCheckTimer = 0;
        this.proficiencyCheckInterval = 1; // Check every second
        this.targetWPM = 48; // FR-023
        this.sustainedSeconds = 0;
        this.requiredSustainTime = 60; // 1 minute at target WPM

        // Difficulty progression - Methodical keyboard exploration
        this.currentStage = 0;
        this.stages = [
            // Phase 1: Master home row positions (single letters only)
            { name: 'zone:homeLeft', difficulty: 'letters', wordsToPass: 40, description: 'Home row - left hand (a,s,d,f)' },
            { name: 'zone:homeRight', difficulty: 'letters', wordsToPass: 40, description: 'Home row - right hand (j,k,l,;)' },
            { name: 'zone:homeLeft,homeRight', difficulty: 'letters', wordsToPass: 50, description: 'Full home row' },

            // Phase 2: Expand from home row (still single letters)
            { name: 'zone:homeLeft,homeRight,indexExtensions', difficulty: 'letters', wordsToPass: 40, description: 'Home row + g,h' },
            { name: 'zone:homeLeft,homeRight,upperLeft', difficulty: 'letters', wordsToPass: 45, description: 'Home row + upper left' },
            { name: 'zone:homeLeft,homeRight,upperRight', difficulty: 'letters', wordsToPass: 45, description: 'Home row + upper right' },
            { name: 'zone:homeLeft,homeRight,upperLeft,upperRight', difficulty: 'letters', wordsToPass: 50, description: 'Home row + upper row' },

            // Phase 3: Add bottom row (still single letters)
            { name: 'zone:homeLeft,homeRight,upperLeft,upperRight,bottomLeft', difficulty: 'letters', wordsToPass: 45, description: 'Add bottom left' },
            { name: 'zone:homeLeft,homeRight,upperLeft,upperRight,bottomLeft,bottomRight', difficulty: 'letters', wordsToPass: 45, description: 'Add bottom right' },
            { name: 'zone:homeLeft,homeRight,upperLeft,upperRight,bottomLeft,bottomRight,indexExtensions,centerColumn', difficulty: 'letters', wordsToPass: 50, description: 'All letters' },

            // Phase 4: Now start with simple words
            { name: 'homeKeys', difficulty: 'short', wordsToPass: 20, description: 'Home row words' },
            { name: 'homeKeys', difficulty: 'medium', wordsToPass: 20, description: 'Longer home row words' },
            { name: 'easyKeys', difficulty: 'short', wordsToPass: 25, description: 'Easy position words' },
            { name: 'easyKeys', difficulty: 'medium', wordsToPass: 25, description: 'Medium words' },
            { name: 'allKeys', difficulty: 'short', wordsToPass: 25, description: 'All keys - short words' },
            { name: 'allKeys', difficulty: 'medium', wordsToPass: 30, description: 'All keys - medium words' },
            { name: 'allKeys', difficulty: 'mixed', wordsToPass: 35, description: 'Mixed difficulty' }
        ];
        this.wordsInCurrentStage = 0;
        this.currentStageDescription = '';

        // Visual effects
        this.lasers = [];
        this.explosions = [];
        this.pendingLaserTimers = []; // Track setTimeout IDs for cleanup
        this.scorePopups = []; // Floating score animations

        // Vertical positioning lanes
        this.lanes = [0.3, 0.4, 0.5, 0.6, 0.7]; // Percentage of screen height
        this.lastLane = 0;

        // Keyboard handler
        this.keyHandler = null;

        // Level complete flag
        this.levelCompleted = false;
        this.gameOver = false; // Track game over state
        this.gameOverTimer = 0; // Timer for auto-return to menu
        this.gameOverTimeout = 10; // Return to menu after 10 seconds

        // Simple instruction display
        this.showInstruction = false;
        this.instructionOpacity = 0;
        this.instructionFadingIn = false;

        // Flag to prevent spawning during stage notifications
        this.spawningEnabled = true;

        // Score submission interstitial state
        this.scoreSubmissionState = null;
        this.submissionInitials = '';
        this.submissionCursorBlink = 0;
        this.submissionError = null;
        this.submissionErrorTimer = 0;
        this.pendingSubmissionTrigger = null;
        this.pendingTestSubmission = false;
        this.highScoreFanfareStop = null; // Track fanfare stop function
    }

    /**
     * Initialize the level
     */
    init() {
        this.reset();
        this.startTime = Date.now();

        // Start session recording for leaderboard
        if (typeof sessionRecorder !== 'undefined') {
            // Use timestamp as seed for consistency
            const seed = Date.now();
            sessionRecorder.startSession(seed);
        }


        // Restore saved stage and score from player progress
        if (this.game.state.playerProgress.typingStage !== undefined) {
            this.currentStage = this.game.state.playerProgress.typingStage;
        }
        if (this.game.state.playerProgress.typingScore !== undefined) {
            this.score = this.game.state.playerProgress.typingScore;

            // Adjust spawn rate and speed for the restored stage
            const isLetterStage = this.currentStage < 10;
            if (isLetterStage) {
                this.currentSpeed = this.baseSpeed * (1 + this.currentStage * 0.05);
                this.baseSpawnInterval = Math.max(1.0, 2.0 - this.currentStage * 0.15);
                this.minSpawnInterval = Math.max(0.5, 0.8 - this.currentStage * 0.08);
            } else {
                this.currentSpeed = this.baseSpeed * (1 + (this.currentStage - 10) * 0.1);
                this.baseSpawnInterval = Math.max(1.5, 2.0 - (this.currentStage - 10) * 0.08);
                this.minSpawnInterval = Math.max(0.8, 1.0 - (this.currentStage - 10) * 0.05);
            }
            this.spawnInterval = this.baseSpawnInterval;
        }

        // Setup keyboard input
        this.keyHandler = (data) => this.handleKeyInput(data);
        this.game.keyboard.on('keydown', this.keyHandler);

        // Always show help text at the start of stage 1 (whether first time or not)
        // Delay showing the helper instruction until stage notification is gone
        this.showInstruction = false;
        this.instructionOpacity = 0;
        // Show helper text after stage notification fades (7 seconds for intro)
        setTimeout(() => {
            this.showInstruction = true;
            this.instructionOpacity = 0.05; // Start with low opacity for fade-in
            this.instructionFadingIn = true; // Enable fade-in animation
        }, 7200);

        // Initialize stage description
        this.currentStageDescription = this.stages[this.currentStage].description;
        this.showStageNotification(this.stages[this.currentStage].description, true, this.currentStage + 1); // true = intro

        // Disable spawning during stage notification
        this.spawningEnabled = false;

        // Ensure AudioManager is initialized before playing fanfare
        // The start button click should have initialized it, but let's make sure
        if (window.AudioManager && !window.AudioManager.initialized) {
            window.AudioManager.init();
        }

        // Play special introductory fanfare for game start
        // Add a small delay to ensure audio context is ready
        setTimeout(() => {
            window.AudioManager.playIntroFanfare();
        }, 100);

        // Update chevrons display
        this.updateStageChevrons();

        // Enable spawning and spawn first word after stage notification is completely gone
        setTimeout(() => {
            this.spawningEnabled = true;
            this.spawnTimer = 0; // Reset spawn timer
            this.spawnWord();
            // For letter stages, spawn a second one quickly
            if (this.currentStage < 10) {
                setTimeout(() => this.spawnWord(), 800);
            }
        }, 7500); // Wait for stage notification to completely disappear (7 seconds + fade time)

        Utils.log.info('Typing level initialized');
    }


    /**
     * Reset level state
     */
    reset() {
        // Clear any pending timers before resetting
        this.clearAllTimers();

        // Stop hot streak music if playing
        if (this.hotStreakMusicStop) {
            this.hotStreakMusicStop();
            this.hotStreakMusicStop = null;
        }

        this.words = [];
        this.activeWordIndex = -1;
        this.typedText = '';
        this.score = 0;
        this.streak = 0;
        this.comboMultiplier = 1;
        this.hotStreakCounter = 0;
        this.hotStreakActive = false;
        this.hotStreakStartTime = 0;
        this.hotStreakBonus = 0;
        this.hotStreakBonusAnimation = null;
        this.hotStreakMultiplierDisplay = null;
        this.lastHotStreakMultiplier = 1;
        this.spawnTimer = 0;
        this.currentStage = 0;  // Reset to first stage
        this.baseSpawnInterval = 1.2; // Letter stage spawn rate
        this.spawnInterval = this.baseSpawnInterval;
        this.recentTypingSpeed = 0;
        this.adaptiveSpawnTimer = 0;
        this.totalKeystrokes = 0;
        this.correctKeystrokes = 0;
        this.charactersTyped = 0;
        this.wordsCompleted = 0;
        this.wordsMissed = 0;
        this.wpmHistory = [];
        this.accuracyHistory = [];
        this.sustainedSeconds = 0;
        this.lasers = [];
        this.explosions = [];
        this.scorePopups = [];
        this.wordsInCurrentStage = 0;
        this.currentSpeed = this.baseSpeed;
        this.levelCompleted = false;
        this.gameOver = false;
        this.gameOverTimer = 0;
        this.currentStageDescription = this.stages[0].description;
        this.stageNotification = null;

        // Reset instruction display
        this.showInstruction = false;  // Will be set properly in init()
        this.instructionOpacity = 0;
        this.instructionFadingIn = false;

        // Reset spawning flag
        this.spawningEnabled = true;

        // Reset timer tracking
        this.pendingLaserTimers = [];
    }

    /**
     * Restart the level
     */
    restart() {
        this.reset();
        this.startTime = Date.now();
        Utils.log.info('Level restarted');
    }

    /**
     * Update level logic
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Handle score submission interstitial
        if (this.scoreSubmissionState) {
            this.updateScoreSubmission(deltaTime);
            return; // Don't update game while submitting
        }

        if (this.levelCompleted) {
            this.updateLevelCompleteAnimation(deltaTime);
            return;
        }

        if (this.gameOver) {
            // Update game over timer for auto-return to menu
            this.gameOverTimer += deltaTime;
            if (this.gameOverTimer >= this.gameOverTimeout) {
                // Return to main menu
                window.location.reload();
            }
            return; // Don't update game logic during game over
        }


        // Update stage notification timer
        if (this.stageNotification && this.stageNotification.timer > 0) {
            this.stageNotification.timer -= deltaTime;
            if (this.stageNotification.timer <= 0) {
                this.stageNotification = null;

                // Check if we have a pending test submission (developer hotkey)
                if (this.pendingTestSubmission) {
                    this.pendingTestSubmission = false;
                    // Wait a moment for the notification to fully clear
                    setTimeout(() => {
                        this.triggerTestSubmission();
                    }, 500);
                }
                // Check if we have a pending regular submission to show after stage notification
                else if (this.pendingSubmissionTrigger) {
                    const trigger = this.pendingSubmissionTrigger;
                    this.pendingSubmissionTrigger = null;

                    // Wait a moment for the notification to fully clear, then show submission
                    setTimeout(() => {
                        this.triggerScoreSubmission(trigger);
                    }, 500);
                }
            }
        }


        // Handle instruction display and fading
        if (this.showInstruction) {
            // Handle fade-in
            if (this.instructionFadingIn && this.instructionOpacity < 1.0) {
                this.instructionOpacity = Math.min(1.0, this.instructionOpacity + deltaTime * 2); // Fade in over 0.5 seconds
                if (this.instructionOpacity >= 1.0) {
                    this.instructionFadingIn = false;
                }
            }
            // Handle fade-out after player completes 3 words
            if (this.wordsCompleted >= 3 && this.instructionOpacity > 0 && !this.instructionFadingIn) {
                this.instructionOpacity -= deltaTime * 0.5; // Fade out over 2 seconds
                if (this.instructionOpacity <= 0) {
                    this.showInstruction = false;
                }
            }
        }

        // Update typing speed tracking
        this.adaptiveSpawnTimer += deltaTime;
        if (this.adaptiveSpawnTimer >= 1.0) { // Calculate typing speed every second
            const timeSeconds = (Date.now() - this.startTime) / 1000;
            if (timeSeconds > 0) {
                this.recentTypingSpeed = this.charactersTyped / timeSeconds;
            }
            this.adaptiveSpawnTimer = 0;

            // Adjust spawn interval based on typing speed
            // Fast typists need more words to maintain their speed
            if (this.recentTypingSpeed > 4) { // > 48 WPM (assuming 5 char words)
                this.spawnInterval = this.minSpawnInterval;
            } else if (this.recentTypingSpeed > 3) { // > 36 WPM
                this.spawnInterval = 0.8;
            } else if (this.recentTypingSpeed > 2) { // > 24 WPM
                this.spawnInterval = 1.2;
            } else {
                this.spawnInterval = this.baseSpawnInterval;
            }
        }

        // Ensure minimum words on screen, but be conservative
        const activeWords = this.words.filter(w => !w.isCompleted).length;
        let minWordsOnScreen = 1; // Default minimum

        // Only increase minimum for very fast typists
        if (this.recentTypingSpeed > 5) { // > 60 WPM
            minWordsOnScreen = 2;
        }

        // Only spawn words if spawning is enabled (not during stage notifications)
        if (this.spawningEnabled) {
            // Spawn word based on timer
            this.spawnTimer += deltaTime;
            if (this.spawnTimer >= this.spawnInterval) {
                // Check if we have space to spawn (avoid overcrowding)
                if (activeWords < 5) { // Never have more than 5 words at once
                    this.spawnWord();
                }
                this.spawnTimer = 0;
            } else if (activeWords < minWordsOnScreen && this.spawnTimer > 0.3) {
                // Emergency spawn if we're below minimum, but with some delay
                this.spawnWord();
                this.spawnTimer = 0;
            }
        }

        // Update words
        for (let i = this.words.length - 1; i >= 0; i--) {
            const word = this.words[i];

            // Store previous position for smooth interpolation
            word.prevX = word.x;

            // Update position
            word.x += this.currentSpeed * deltaTime;

            // Check if word reached right edge (fail condition)
            if (word.x + word.width > this.game.renderer.width) {
                this.wordReachedEdge(word);
                this.words.splice(i, 1);
            }
        }

        // Update active word (rightmost word)
        this.updateActiveWord();

        // Update visual effects
        this.updateLasers(deltaTime);
        this.updateExplosions(deltaTime);
        this.updateScorePopups(deltaTime);

        // Update bonus animation
        if (this.hotStreakBonusAnimation) {
            this.hotStreakBonusAnimation.timer -= deltaTime;
            this.hotStreakBonusAnimation.opacity = Math.max(0, this.hotStreakBonusAnimation.timer / 2);
            this.hotStreakBonusAnimation.y -= deltaTime * 50; // Float upward
            this.hotStreakBonusAnimation.scale = Math.max(1, this.hotStreakBonusAnimation.scale - deltaTime * 0.5);

            if (this.hotStreakBonusAnimation.timer <= 0) {
                this.hotStreakBonusAnimation = null;
            }
        }

        // Update multiplier display animation
        if (this.hotStreakMultiplierDisplay) {
            this.hotStreakMultiplierDisplay.timer -= deltaTime;
            // Quick scale down animation
            if (this.hotStreakMultiplierDisplay.scale > 1) {
                this.hotStreakMultiplierDisplay.scale = Math.max(1, this.hotStreakMultiplierDisplay.scale - deltaTime * 2);
            }

            if (this.hotStreakMultiplierDisplay.timer <= 0) {
                this.hotStreakMultiplierDisplay = null;
            }
        }

        // Update proficiency tracking
        this.updateProficiency(deltaTime);

        // Update UI
        this.updateUI();
    }

    /**
     * Spawn a new word
     */
    spawnWord() {
        const text = this.generateWord();

        // Choose a lane - allow same lane if existing words are far enough
        let lane;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            lane = Math.floor(Math.random() * this.lanes.length);
            attempts++;

            // Check if this lane is clear enough
            const laneY = this.game.renderer.height * this.lanes[lane];
            const hasBlockingWord = this.words.some(word => {
                const sameLane = Math.abs(word.y - laneY) < 10;
                const tooClose = word.x < 400; // Require more space between words
                return sameLane && tooClose && !word.isCompleted;
            });

            // If lane is clear or we've tried too many times, use it
            if (!hasBlockingWord || attempts >= maxAttempts) {
                break;
            }
        } while (attempts < maxAttempts);

        this.lastLane = lane;

        const word = {
            id: Utils.generateId(),
            text: text,
            typedIndex: 0,
            x: -150, // Start off-screen left
            prevX: -150, // Previous position for interpolation
            y: this.game.renderer.height * this.lanes[lane],
            width: this.game.renderer.measureText(text, 'large'),
            isActive: false,
            isCompleted: false
        };

        this.words.push(word);

        // Record word spawn for leaderboard
        if (typeof sessionRecorder !== 'undefined' && sessionRecorder.isSessionActive()) {
            word.recordIndex = sessionRecorder.addWord({
                text: word.text,
                x: word.x,
                y: word.y,
                word: word.text
            });
        }
    }

    /**
     * Generate a word based on current difficulty
     * @returns {string}
     */
    generateWord() {
        const stage = this.stages[this.currentStage];
        const words = WordCorpus.getWords(stage.difficulty, stage.name);
        return Utils.randomElement(words);
    }

    /**
     * Update which word is active (rightmost)
     */
    updateActiveWord() {
        let rightmostIndex = -1;
        let rightmostX = -Infinity;

        for (let i = 0; i < this.words.length; i++) {
            const word = this.words[i];
            if (!word.isCompleted && word.x > rightmostX) {
                rightmostX = word.x;
                rightmostIndex = i;
            }
        }

        // Update active states
        this.words.forEach((word, index) => {
            word.isActive = (index === rightmostIndex);
        });

        this.activeWordIndex = rightmostIndex;
    }

    /**
     * Handle keyboard input
     * @param {Object} data - Keyboard event data
     */
    handleKeyInput(data) {
        // Handle input during game over
        if (this.gameOver && !this.scoreSubmissionState) {
            if (data.key === 'r' || data.key === 'R') {
                // Restart the game
                this.reset();
                this.init();
                return;
            } else if (data.key === 'Escape') {
                // Return to main menu
                window.location.reload(); // Simple way to return to start screen
                return;
            }
            return; // Ignore other input during game over
        }

        // Handle input during score submission interstitial
        if (this.scoreSubmissionState) {
            this.handleSubmissionInput(data);
            return;
        }

        // Developer hotkey for testing score submission (only on localhost)
        const isLocalDev = window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1' ||
                          window.location.protocol === 'file:';

        if (isLocalDev) {
            if (data.key === '1' && !data.ctrlKey && !data.metaKey && !data.altKey) {
                // Create mock session data for testing
                this.triggerTestSubmission();
                return;
            }
        }

        // Check for manual score submission (Ctrl/Cmd + S)
        if ((data.ctrlKey || data.metaKey) && data.key === 's') {
            if (this.isLeaderboardWorthy()) {
                this.triggerScoreSubmission('manual');
                data.preventDefault();
            }
            return;
        }

        if (this.activeWordIndex === -1 || this.levelCompleted) return;

        const activeWord = this.words[this.activeWordIndex];
        if (!activeWord || activeWord.isCompleted || activeWord.fullTyped) return;

        const key = data.key;

        // Handle backspace
        if (key === 'Backspace') {
            if (this.typedText.length > 0) {
                this.typedText = this.typedText.slice(0, -1);
                activeWord.typedIndex = Math.max(0, activeWord.typedIndex - 1);
            }
            return;
        }

        // Only process single characters
        if (key.length !== 1) return;

        this.totalKeystrokes++;

        // Check if keystroke matches
        const expectedChar = activeWord.text[activeWord.typedIndex];

        if (key === expectedChar) {
            // Correct keystroke
            this.correctKeystrokes++;
            this.charactersTyped++;
            this.typedText += key;
            activeWord.typedIndex++;
            this.streak++;
            this.hotStreakCounter++;

            // Check for hot streak activation (starts at 10 keystrokes)
            if (!this.hotStreakActive && this.hotStreakCounter >= 10) {
                this.hotStreakActive = true;
                this.hotStreakStartTime = Date.now();
                this.lastHotStreakMultiplier = 1.25;

                // Show multiplier display
                this.hotStreakMultiplierDisplay = {
                    text: '1.25x MULTIPLIER!',
                    timer: 3.0, // Show for 3 seconds
                    scale: 2.0, // Start big
                    color: '#ffaa00' // Orange
                };

                // Start hot streak music
                if (window.AudioManager && window.AudioManager.initialized) {
                    this.hotStreakMusicStop = window.AudioManager.playHotStreakMusic();
                    window.AudioManager.playPowerUp(); // Play power-up for first activation
                }
            } else if (this.hotStreakActive) {
                // Check for multiplier changes
                let currentMultiplier = 1.25;
                let multiplierText = '1.25x';
                let multiplierColor = '#ffaa00';

                if (this.hotStreakCounter >= 50) {
                    currentMultiplier = 3.0;
                    multiplierText = '3x';
                    multiplierColor = '#ff00ff';
                } else if (this.hotStreakCounter >= 30) {
                    currentMultiplier = 2.0;
                    multiplierText = '2x';
                    multiplierColor = '#ff0000';
                } else if (this.hotStreakCounter >= 20) {
                    currentMultiplier = 1.5;
                    multiplierText = '1.5x';
                    multiplierColor = '#ffff00';
                }

                // If multiplier changed, show it and play sound
                if (currentMultiplier !== this.lastHotStreakMultiplier) {
                    this.lastHotStreakMultiplier = currentMultiplier;

                    this.hotStreakMultiplierDisplay = {
                        text: `${multiplierText} MULTIPLIER!`,
                        timer: 3.0,
                        scale: 2.0,
                        color: multiplierColor
                    };

                    window.AudioManager.playPowerUp();
                }
            }

            // Play keystroke sound
            window.AudioManager.playKeystroke();

            // Register correct input (resets error cooldown)
            this.game.keyboard.registerCorrect();

            // Record correct keystroke for leaderboard
            if (typeof sessionRecorder !== 'undefined' && sessionRecorder.isSessionActive()) {
                sessionRecorder.recordKeystroke(key, activeWord.recordIndex || 0, true);
            }

            // Check if word is complete
            if (activeWord.typedIndex >= activeWord.text.length) {
                // Mark word as complete but delay the laser effect
                // This allows the last letter to be rendered green first
                activeWord.fullTyped = true;
                // Don't clear typedText yet - let it show under the word
                setTimeout(() => {
                    this.completeWord(activeWord);
                }, 150); // 150ms delay to show the completed word with typed text
            }
        } else {
            // Incorrect keystroke - ends hot streak
            this.streak = 0;
            this.hotStreakCounter = 0;

            // End hot streak if active and award bonus
            if (this.hotStreakActive) {
                this.endHotStreak();
            }

            // Play wrong key sound
            window.AudioManager.playWrongKey();

            // Register error for cooldown tracking
            this.game.keyboard.registerError();

            // Record incorrect keystroke for leaderboard
            if (typeof sessionRecorder !== 'undefined' && sessionRecorder.isSessionActive()) {
                sessionRecorder.recordKeystroke(key, activeWord.recordIndex || 0, false);
            }
        }
    }

    /**
     * Complete a word
     * @param {Object} word
     */
    completeWord(word) {
        word.isCompleted = true;
        this.wordsCompleted++;
        this.wordsInCurrentStage++;

        // More balanced arcade-style scoring system
        // Base points = word length (1 point per letter for single letters, slightly more for words)
        let basePoints = this.currentStage < 10 ? word.text.length : word.text.length * 2;

        // Stage bonus (small incremental bonus)
        const stageBonus = (this.currentStage + 1) * 2;

        // Speed bonus (risk/reward but smaller)
        // Words further left are worth a bit more
        const speedBonus = Math.max(0, Math.floor((this.game.renderer.width - word.x) / 50));

        // Combo multiplier (increases with streak but more modest)
        this.comboMultiplier = 1 + Math.floor(this.streak / 5) * 0.1; // +10% every 5 words

        // Calculate base points (without hot streak bonus)
        const baseTotal = Math.floor((basePoints + stageBonus + speedBonus) * this.comboMultiplier);

        // If hot streak is active, calculate bonus points (but don't add to score yet)
        if (this.hotStreakActive) {
            let bonusMultiplier = 0.25; // Start at 25% bonus
            if (this.hotStreakCounter >= 50) {
                bonusMultiplier = 2.0; // 200% bonus for 50+ keystrokes
            } else if (this.hotStreakCounter >= 30) {
                bonusMultiplier = 1.0; // 100% bonus for 30+ keystrokes
            } else if (this.hotStreakCounter >= 20) {
                bonusMultiplier = 0.5; // 50% bonus for 20+ keystrokes
            }

            // Add to bonus accumulator (will be awarded when streak ends)
            const bonusPoints = Math.floor(baseTotal * bonusMultiplier);
            this.hotStreakBonus += bonusPoints;
        }

        // Store base points on word for later display and score increment when explosion happens
        word.points = baseTotal;

        // Clear typed text now that the word is complete
        this.typedText = '';

        // Record word completion for leaderboard
        if (typeof sessionRecorder !== 'undefined' && sessionRecorder.isSessionActive()) {
            sessionRecorder.completeWord(word.recordIndex || 0);
        }

        // Store word reference for laser to find it
        word.hitTime = Date.now();

        // Create multiple laser effects - one for each letter
        // Ensure we use the exact same font settings as the renderer for consistency
        const renderer = this.game.renderer;
        renderer.ctx.save();
        renderer.ctx.font = renderer.getFont('large');

        // Measure a single character width (all characters in monospace font are same width)
        const charWidth = renderer.ctx.measureText('M').width;
        renderer.ctx.restore();

        // Track timers for this word's lasers
        const wordLaserTimers = [];

        for (let i = 0; i < word.text.length; i++) {
            // Stagger the lasers slightly for a cooler effect
            const timerId = setTimeout(() => {
                // Create laser that will track the moving word
                this.createLaser(word, i, charWidth);

                // Only play sound for first laser to prevent audio overload
                if (i === 0) {
                    window.AudioManager.playLaser();
                }

                // Remove this timer from the word's timer list
                const idx = wordLaserTimers.indexOf(timerId);
                if (idx !== -1) {
                    wordLaserTimers.splice(idx, 1);
                }

                // Also remove from pending timers
                const globalIdx = this.pendingLaserTimers.indexOf(timerId);
                if (globalIdx !== -1) {
                    this.pendingLaserTimers.splice(globalIdx, 1);
                }
            }, i * 30); // 30ms delay between each laser

            // Track the timer
            wordLaserTimers.push(timerId);
            this.pendingLaserTimers.push(timerId);
        }

        // Store timers on the word so we can clean them up if word is removed early
        word.laserTimers = wordLaserTimers;

        // Check difficulty progression
        this.updateDifficulty();
    }

    /**
     * Handle word reaching right edge
     * @param {Object} word
     */
    wordReachedEdge(word) {
        this.streak = 0;
        this.comboMultiplier = 1; // Reset combo
        this.hotStreakCounter = 0;

        // End hot streak if active and award bonus
        if (this.hotStreakActive) {
            this.endHotStreak();
        }

        // Increment words missed
        this.wordsMissed++;

        // Check for game over
        if (this.wordsMissed >= this.maxWordsMissed) {
            this.triggerGameOver();
        } else {
            // Play word miss sound when word escapes
            window.AudioManager.playWordMiss();
        }

        // Clear typed text if this was the active word
        if (word.isActive) {
            this.typedText = '';
        }

        // Clear any pending laser timers for this word
        if (word.laserTimers && word.laserTimers.length > 0) {
            word.laserTimers.forEach(timerId => {
                clearTimeout(timerId);
                // Remove from global pending timers
                const idx = this.pendingLaserTimers.indexOf(timerId);
                if (idx !== -1) {
                    this.pendingLaserTimers.splice(idx, 1);
                }
            });
            word.laserTimers = [];
        }
    }



    /**
     * Trigger game over
     */
    triggerGameOver() {
        this.gameOver = true;
        this.spawningEnabled = false;

        // Play game over sound
        if (window.AudioManager && window.AudioManager.initialized) {
            window.AudioManager.playGameOver();
        }

        // Stop hot streak music if playing
        if (this.hotStreakMusicStop) {
            this.hotStreakMusicStop();
            this.hotStreakMusicStop = null;
        }

        // Clear all words from screen
        this.words = [];
        this.lasers = [];
        this.explosions = [];

        // Clear any pending timers
        this.clearAllTimers();

        // Record session end for leaderboard (if active)
        if (typeof sessionRecorder !== 'undefined' && sessionRecorder.isSessionActive()) {
            sessionRecorder.endSession();
        }

        // Check if score is high enough for submission
        if (this.isLeaderboardWorthy()) {
            // Wait a moment for game over sound to play, then show submission
            setTimeout(() => {
                this.triggerScoreSubmission('game_over');
            }, 2500);
        }

        Utils.log.info(`Game Over - Score: ${this.score}, Words Missed: ${this.wordsMissed}`);
    }

    /**
     * End hot streak and award accumulated bonus
     */
    endHotStreak() {
        if (!this.hotStreakActive) return;

        this.hotStreakActive = false;
        this.lastHotStreakMultiplier = 1;
        this.hotStreakMultiplierDisplay = null; // Clear any active display

        // Stop hot streak music
        if (this.hotStreakMusicStop) {
            this.hotStreakMusicStop();
            this.hotStreakMusicStop = null;
        }

        // Award bonus if any accumulated
        if (this.hotStreakBonus > 0) {
            // Add bonus to score
            this.score += this.hotStreakBonus;

            // Save updated score
            this.game.state.playerProgress.typingScore = this.score;
            this.game.saveProgress();

            // Play celebration sound
            window.AudioManager.playCelebration();

            // Create bonus animation with clear hot streak labeling
            this.hotStreakBonusAnimation = {
                text: `HOT STREAK BONUS`,
                bonusAmount: `+${this.hotStreakBonus}`,
                opacity: 1.0,
                y: this.game.renderer.height / 2, // Center of screen
                scale: 1.5, // Start smaller
                timer: 1.5 // Show for shorter time (1.5 seconds)
            };

            // Reset bonus accumulator
            this.hotStreakBonus = 0;
        }
    }

    /**
     * Create floating score popup
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} points - Points to display
     */
    createScorePopup(x, y, points) {
        this.scorePopups.push({
            x: x,
            y: y - 30, // Start above the word
            text: `+${points}`,
            life: 0.7, // Shorter lifespan for less distraction
            vy: -40 // Float upward much slower
        });
    }

    /**
     * Update score popups
     * @param {number} deltaTime
     */
    updateScorePopups(deltaTime) {
        for (let i = this.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.scorePopups[i];
            popup.y += popup.vy * deltaTime;
            popup.life -= deltaTime;

            if (popup.life <= 0) {
                this.scorePopups.splice(i, 1);
            }
        }
    }

    /**
     * Create laser effect FROM BOTTOM OF SCREEN
     * @param {Object} targetWord - The word being targeted
     * @param {number} letterIndex - Index of the letter being targeted
     * @param {number} charWidth - Width of a single character
     */
    createLaser(targetWord, letterIndex, charWidth) {
        // Calculate initial position of the letter
        const initialX = targetWord.x + (letterIndex * charWidth) + (charWidth / 2);

        // Laser shoots from bottom of screen to the word
        this.lasers.push({
            startX: initialX, // Starting X position (will be updated as word moves)
            startY: this.game.renderer.height,
            targetWord: targetWord,
            letterIndex: letterIndex,
            charWidth: charWidth,
            targetX: initialX,
            targetY: targetWord.y,
            progress: 0,
            speed: 3, // Progress speed (0 to 1)
            hasHit: false,
            isLastLaser: letterIndex === targetWord.text.length - 1
        });
    }

    /**
     * Create explosion effect
     * @param {number} x
     * @param {number} y
     */
    createExplosion(x, y) {
        const particles = [];
        for (let i = 0; i < 15; i++) { // Same as attract mode
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 250, // Match attract mode velocity
                vy: (Math.random() - 0.5) * 250,
                life: 1
            });
        }

        this.explosions.push({
            x: x,
            y: y,
            particles: particles,
            life: 1
        });
    }

    /**
     * Update laser effects
     * @param {number} deltaTime
     */
    updateLasers(deltaTime) {
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.progress += laser.speed * deltaTime;

            // Calculate current target position based on word's current position
            if (laser.targetWord && !laser.hasHit) {
                // Use the interpolated position for smoother tracking
                // Note: We're using the current x position, not the interpolated one for accuracy
                const wordX = laser.targetWord.x;

                // Calculate the current X position of the specific letter
                const currentX = wordX + (laser.letterIndex * laser.charWidth) + (laser.charWidth / 2);
                laser.targetX = currentX;
                laser.targetY = laser.targetWord.y;

                // Update start X to follow the word horizontally (for vertical laser)
                laser.startX = currentX;
            }

            // When laser reaches target, create explosion
            if (laser.progress >= 1 && !laser.hasHit) {
                laser.hasHit = true;

                // Create explosion at the laser's target position
                this.createExplosion(laser.targetX, laser.targetY);

                // Only remove the word and show score when the LAST laser hits
                if (laser.targetWord && laser.isLastLaser) {
                    // Increment score when explosion happens (not when laser is shot)
                    if (laser.targetWord.points) {
                        this.score += laser.targetWord.points;

                        // Save score to player progress
                        this.game.state.playerProgress.typingScore = this.score;
                        this.game.saveProgress();

                        // Show score popup at explosion location
                        this.createScorePopup(laser.targetX, laser.targetY, laser.targetWord.points);
                    }

                    const index = this.words.indexOf(laser.targetWord);
                    if (index !== -1) {
                        this.words.splice(index, 1);
                    }
                    window.AudioManager.playExplosion();
                }
            }

            // Remove laser after animation completes
            if (laser.progress >= 1.2) {
                this.lasers.splice(i, 1);
            }
        }
    }

    /**
     * Update explosion effects
     * @param {number} deltaTime
     */
    updateExplosions(deltaTime) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.life -= deltaTime * 2;

            // Update particles
            explosion.particles.forEach(particle => {
                particle.x += particle.vx * deltaTime;
                particle.y += particle.vy * deltaTime;
                particle.vy += 500 * deltaTime; // Gravity
                particle.life = explosion.life;
            });

            if (explosion.life <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }



    /**
     * Trigger test submission with mock data (developer testing only)
     */
    triggerTestSubmission() {
        console.log('Developer mode: Triggering test score submission');

        // Don't allow if submission is already in progress
        if (this.scoreSubmissionState) {
            console.log('Submission already in progress');
            return;
        }

        // If there's a stage notification showing, wait for it to clear
        if (this.stageNotification) {
            console.log('Waiting for stage notification to clear...');
            // Queue the test submission for after the notification
            this.pendingTestSubmission = true;
            return;
        }

        // Calculate current stats
        const timeMinutes = Math.max(0.01, (Date.now() - this.startTime) / 60000);
        const currentWPM = Math.round((this.charactersTyped / 5) / timeMinutes) || 25;
        const accuracy = this.totalKeystrokes > 0
            ? Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100)
            : 95;

        // Create mock session data that looks realistic
        const mockSessionData = {
            seed: Date.now(),
            stage: this.currentStage + 1,
            score: this.score, // Include arcade score
            startTime: this.startTime,
            endTime: Date.now(),
            duration: Date.now() - this.startTime,
            stats: {
                wpm: currentWPM,
                accuracy: accuracy,
                wordsCompleted: this.wordsCompleted || 10,
                totalKeystrokes: this.totalKeystrokes || 150,
                correctKeystrokes: this.correctKeystrokes || 142
            },
            words: [
                { text: 'test', completed: true },
                { text: 'word', completed: true },
                { text: 'data', completed: true }
            ],
            keystrokes: [
                { key: 't', timestamp: 100, wordIndex: 0, correct: true },
                { key: 'e', timestamp: 200, wordIndex: 0, correct: true },
                { key: 's', timestamp: 300, wordIndex: 0, correct: true },
                { key: 't', timestamp: 400, wordIndex: 0, correct: true }
            ],
            completions: [
                { wordIndex: 0, timestamp: 500 },
                { wordIndex: 1, timestamp: 1000 },
                { wordIndex: 2, timestamp: 1500 }
            ]
        };

        // Clear any pending submission triggers to avoid conflicts
        this.pendingSubmissionTrigger = null;

        // Show interstitial submission screen
        this.showScoreSubmissionInterstitial(mockSessionData);
    }

    /**
     * Show score submission interstitial (pauses game)
     * @param {Object} sessionData - The session data to submit
     */
    showScoreSubmissionInterstitial(sessionData) {
        // Pause the game
        this.scoreSubmissionState = {
            sessionData: sessionData,
            status: 'input', // 'input', 'submitting', 'success', 'error'
            fadeIn: 0,
            submitted: false
        };
        this.submissionInitials = '';
        this.submissionCursorBlink = 0;
        this.submissionError = null;
        this.submissionErrorTimer = 0;

        // Clear all game state to prevent interference
        this.spawningEnabled = false;
        this.words = [];
        this.lasers = [];
        this.explosions = [];

        // Clear any pending timers
        this.clearAllTimers();

        // Clear any notifications
        this.stageNotification = null;

        // Start playing the looping high score fanfare
        if (window.AudioManager && window.AudioManager.initialized) {
            this.highScoreFanfareStop = window.AudioManager.playHighScoreFanfare();
        }
    }

    /**
     * Handle keyboard input during submission
     * @param {Object} data - Keyboard event data
     */
    handleSubmissionInput(data) {
        if (!this.scoreSubmissionState || this.scoreSubmissionState.status !== 'input') return;

        const key = data.key;

        // Handle Enter to submit
        if (key === 'Enter') {
            if (this.submissionInitials.length === 3) {
                this.submitScore();
            } else {
                this.submissionError = 'Enter exactly 3 letters';
                this.submissionErrorTimer = 2;
            }
            return;
        }

        // Handle backspace
        if (key === 'Backspace') {
            if (this.submissionInitials.length > 0) {
                this.submissionInitials = this.submissionInitials.slice(0, -1);
                this.submissionError = null;
            }
            return;
        }

        // Only accept letters
        if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
            if (this.submissionInitials.length < 3) {
                this.submissionInitials += key.toUpperCase();
                this.submissionError = null;
            }
        }
    }

    /**
     * Update score submission interstitial
     * @param {number} deltaTime - Time since last frame
     */
    updateScoreSubmission(deltaTime) {
        if (!this.scoreSubmissionState) return;

        // Fade in animation
        if (this.scoreSubmissionState.fadeIn < 1) {
            this.scoreSubmissionState.fadeIn = Math.min(1, this.scoreSubmissionState.fadeIn + deltaTime * 2);
        }

        // Cursor blink animation
        this.submissionCursorBlink += deltaTime;

        // Error message timer
        if (this.submissionErrorTimer > 0) {
            this.submissionErrorTimer -= deltaTime;
            if (this.submissionErrorTimer <= 0) {
                this.submissionError = null;
            }
        }

        // Auto-close after success
        if (this.scoreSubmissionState.status === 'success') {
            this.scoreSubmissionState.successTimer = (this.scoreSubmissionState.successTimer || 0) + deltaTime;
            if (this.scoreSubmissionState.successTimer > 2) {
                this.closeScoreSubmission();
            }
        }
    }

    /**
     * Submit the score to the API
     */
    async submitScore() {
        if (!this.scoreSubmissionState || this.scoreSubmissionState.status !== 'input') return;

        this.scoreSubmissionState.status = 'submitting';

        try {
            // Use the score submission module to handle the actual submission
            if (typeof scoreSubmission !== 'undefined') {
                // Create a temporary modal just for the API call
                const response = await this.submitScoreDirectly(
                    this.submissionInitials,
                    this.scoreSubmissionState.sessionData
                );

                if (response.success) {
                    this.scoreSubmissionState.status = 'success';
                } else {
                    this.scoreSubmissionState.status = 'error';
                    this.submissionError = response.error || 'Submission failed';
                    this.submissionErrorTimer = 3;
                    // Go back to input state after error
                    setTimeout(() => {
                        if (this.scoreSubmissionState) {
                            this.scoreSubmissionState.status = 'input';
                        }
                    }, 1000);
                }
            } else {
                this.scoreSubmissionState.status = 'error';
                this.submissionError = 'Submission system not loaded';
                this.submissionErrorTimer = 3;
            }
        } catch (error) {
            console.error('Score submission error:', error);
            this.scoreSubmissionState.status = 'error';
            this.submissionError = 'Network error';
            this.submissionErrorTimer = 3;
            setTimeout(() => {
                if (this.scoreSubmissionState) {
                    this.scoreSubmissionState.status = 'input';
                }
            }, 1000);
        }
    }

    /**
     * Submit score directly without modal
     * @param {string} initials - Player initials
     * @param {Object} sessionData - Session data
     * @returns {Promise<Object>} Submission result
     */
    async submitScoreDirectly(initials, sessionData) {
        // This method will use the scoreSubmission module's internal methods
        // We need to create the submission data and call the API

        // Get or create user identity
        let identity = null;
        if (typeof userIdentity !== 'undefined') {
            if (!userIdentity.hasIdentity()) {
                identity = userIdentity.createIdentity(initials);
            } else {
                identity = userIdentity.getIdentity();
                if (identity.initials !== initials) {
                    userIdentity.updateInitials(initials);
                    identity.initials = initials;
                }
            }
        } else {
            identity = {
                uuid: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    const r = Math.random() * 16 | 0;
                    const v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                }),
                initials: initials
            };
        }

        // Calculate session hash
        let calculatedHash = null;
        if (typeof sessionHash !== 'undefined' && sessionHash.calculate) {
            try {
                calculatedHash = await sessionHash.calculate(sessionData);
            } catch (error) {
                console.error('Failed to calculate session hash:', error);
                return { success: false, error: 'Hash calculation failed' };
            }
        } else {
            return { success: false, error: 'Hash system not loaded' };
        }

        // Prepare submission
        const submission = {
            userId: identity.uuid,
            initials: initials,
            sessionHash: calculatedHash,
            sessionData: sessionData,
            timestamp: Date.now()
        };

        // Submit to API
        const response = await fetch('https://typeattack-leaderboard.kerry-f2f.workers.dev/api/submit-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submission)
        });

        return await response.json();
    }

    /**
     * Close the score submission interstitial
     */
    closeScoreSubmission() {
        this.scoreSubmissionState = null;
        this.submissionInitials = '';
        this.submissionError = null;
        this.spawningEnabled = true;

        // Stop the high score fanfare
        if (this.highScoreFanfareStop) {
            this.highScoreFanfareStop();
            this.highScoreFanfareStop = null;
        }

        // Restart session recording for continued play
        if (typeof sessionRecorder !== 'undefined') {
            const seed = Date.now();
            sessionRecorder.startSession(seed);
        }
    }

    /**
     * Trigger score submission interstitial
     * @param {string} trigger - What triggered the submission (e.g., 'stage_complete', 'level_complete', 'high_score')
     */
    triggerScoreSubmission(trigger) {
        // Don't allow submission if one is already in progress or stage notification is showing
        if (this.scoreSubmissionState || this.stageNotification) return;

        if (typeof sessionRecorder !== 'undefined' && sessionRecorder.isSessionActive()) {
            const sessionData = sessionRecorder.endSession();
            if (sessionData) {
                // Export the session data for submission
                sessionRecorder.exportForSubmission().then(exportedData => {
                    // Show interstitial submission screen
                    this.showScoreSubmissionInterstitial(exportedData);
                });

                // Restart recording for continued play
                const seed = Date.now();
                sessionRecorder.startSession(seed);
            }
        }
    }

    /**
     * Check if current performance is leaderboard-worthy
     * @returns {boolean}
     */
    isLeaderboardWorthy() {
        const timeMinutes = Math.max(0.01, (Date.now() - this.startTime) / 60000);
        const currentWPM = Math.round((this.charactersTyped / 5) / timeMinutes);
        const accuracy = this.totalKeystrokes > 0
            ? Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100)
            : 100;

        // Consider it leaderboard-worthy if:
        // - Completed 5+ stages
        // - OR achieved 40+ WPM with 85%+ accuracy
        // - OR played for 2+ minutes with 30+ WPM
        // - OR reached stage 10+ (word stages)
        return (this.currentStage >= 5) ||
               (currentWPM >= 40 && accuracy >= 85) ||
               (timeMinutes >= 2 && currentWPM >= 30) ||
               (this.currentStage >= 10);
    }

    /**
     * Update difficulty based on performance
     */
    updateDifficulty() {
        const stage = this.stages[this.currentStage];

        // Check if ready to advance to next stage
        if (this.wordsInCurrentStage >= stage.wordsToPass) {
            // Play success sound for completing the required words
            window.AudioManager.playSuccess();

            if (this.currentStage < this.stages.length - 1) {
                this.currentStage++;
                this.wordsInCurrentStage = 0;

                // Save the current stage to player progress
                this.game.state.playerProgress.typingStage = this.currentStage;
                this.game.saveProgress();

                // Check if this is a leaderboard-worthy achievement
                // Offer submission at stages 5, 10, 15, and final stage
                const milestoneStages = [4, 9, 14, this.stages.length - 2]; // 0-indexed
                if (milestoneStages.includes(this.currentStage - 1) && this.isLeaderboardWorthy()) {
                    // Mark that we should show submission after stage notification
                    this.pendingSubmissionTrigger = 'stage_milestone';
                }

                // Update session recorder stage
                if (typeof sessionRecorder !== 'undefined' && sessionRecorder.isSessionActive()) {
                    sessionRecorder.updateStage(this.currentStage + 1);
                }

                // For single letter stages, keep speed slower
                const isLetterStage = this.currentStage < 10; // First 10 stages are single letters

                if (isLetterStage) {
                    // Slower speed for letter practice
                    this.currentSpeed = this.baseSpeed * (1 + this.currentStage * 0.05);
                    // Faster spawn for letters to maintain engagement
                    this.baseSpawnInterval = Math.max(1.0, 2.0 - this.currentStage * 0.15);
                    this.minSpawnInterval = Math.max(0.5, 0.8 - this.currentStage * 0.08);
                } else {
                    // Normal speed progression for words
                    this.currentSpeed = this.baseSpeed * (1 + (this.currentStage - 10) * 0.1);
                    this.baseSpawnInterval = Math.max(1.5, 2.0 - (this.currentStage - 10) * 0.08);
                    this.minSpawnInterval = Math.max(0.8, 1.0 - (this.currentStage - 10) * 0.05);
                }

                const newStage = this.stages[this.currentStage];
                this.currentStageDescription = newStage.description;
                Utils.log.info(`Advanced to stage: ${newStage.description}`);

                // Clear all words/letters currently on screen when changing stages
                this.words = [];

                // Show stage advancement notification
                this.showStageNotification(newStage.description);

                // Disable spawning during stage notification
                this.spawningEnabled = false;

                // Update chevrons display
                this.updateStageChevrons();

                // Re-enable spawning and spawn first word after notification is gone
                setTimeout(() => {
                    this.spawningEnabled = true;
                    this.spawnTimer = 0; // Reset spawn timer
                    this.spawnWord();
                    if (this.currentStage < 10) {
                        setTimeout(() => this.spawnWord(), 800);
                    }
                }, 5500); // Wait for stage notification to completely disappear (5 seconds + fade time)

                // Play fanfare sound for stage advancement
                window.AudioManager.playStageAdvance();
            }
        }
    }

    /**
     * Show stage advancement notification
     */
    showStageNotification(description, isIntro = false, stageNum = null) {
        // Create a temporary notification (will be drawn in render)
        const stageNumber = stageNum !== null ? stageNum : (this.currentStage + 1);
        this.stageNotification = {
            text: isIntro ? `Welcome! Stage ${stageNumber}: ${description}` : `Stage ${stageNumber}: ${description}`,
            timer: isIntro ? 7.0 : 5.0 // Show intro longer (7 seconds vs 5)
        };
    }

    /**
     * Update proficiency tracking
     * @param {number} deltaTime
     */
    updateProficiency(deltaTime) {
        this.proficiencyCheckTimer += deltaTime;

        if (this.proficiencyCheckTimer >= this.proficiencyCheckInterval) {
            this.proficiencyCheckTimer = 0;

            // Calculate current WPM
            const timeMinutes = (Date.now() - this.startTime) / 60000;

            // Only update proficiency if player has been playing for at least 5 seconds
            // and has typed some characters - this prevents resetting saved progress
            if (timeMinutes > (5 / 60) && this.charactersTyped > 0) {
                const currentWPM = Math.round((this.charactersTyped / 5) / timeMinutes);
                this.wpmHistory.push(currentWPM);

                // Keep only last 60 seconds of history
                if (this.wpmHistory.length > 60) {
                    this.wpmHistory.shift();
                }

                // Check if maintaining target WPM
                if (currentWPM >= this.targetWPM) {
                    this.sustainedSeconds++;

                    if (this.sustainedSeconds >= this.requiredSustainTime && !this.levelCompleted) {
                        // Achieved 48 WPM for 1 minute!
                        this.unlockNextLevel();
                    }
                } else {
                    this.sustainedSeconds = 0;
                }

                // Calculate proficiency percentage
                const proficiency = Math.min(100, (currentWPM / this.targetWPM) * 80);

                // Only update if new proficiency is higher than current (don't regress)
                const currentProficiency = this.game.state.playerProgress.typingProficiency;
                if (proficiency > currentProficiency) {
                    this.game.updateProficiency('typing', proficiency);
                }
            }
        }
    }

    /**
     * Unlock next level
     */
    unlockNextLevel() {
        this.levelCompleted = true;
        this.game.updateProficiency('typing', 80);
        window.AudioManager.playLevelComplete();
        Utils.log.info('Typing level completed - 48 WPM sustained for 1 minute!');

        // Clear remaining words
        this.words = [];

        // Trigger score submission for this achievement
        this.triggerScoreSubmission('level_complete');

        // Trigger level complete animation
        this.levelCompleteTimer = 0;
    }

    /**
     * Update level complete animation
     * @param {number} deltaTime
     */
    updateLevelCompleteAnimation(deltaTime) {
        this.levelCompleteTimer = (this.levelCompleteTimer || 0) + deltaTime;

        // After 3 seconds, transition to vim level if unlocked
        if (this.levelCompleteTimer > 3) {
            if (this.game.state.playerProgress.vimUnlocked) {
                this.game.loadLevel('vim');
            } else {
                // Reset to continue playing
                this.levelCompleted = false;
                this.reset();
                this.startTime = Date.now();
            }
        }
    }

    /**
     * Update UI elements
     */
    updateUI() {
        // Update score display
        const scoreDisplay = document.getElementById('score-display');
        if (scoreDisplay) {
            scoreDisplay.style.display = 'flex';
            const scoreValue = scoreDisplay.querySelector('.score-value');
            if (scoreValue) {
                // Format score with leading zeros (7 digits like classic arcade)
                scoreValue.textContent = this.score.toString().padStart(7, '0');
            }
        }

        // Calculate stats (for internal use, not displayed in UI anymore)
        const timeMinutes = Math.max(0.01, (Date.now() - this.startTime) / 60000);
        const currentWPM = Math.round((this.charactersTyped / 5) / timeMinutes);
        const accuracy = this.totalKeystrokes > 0
            ? Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100)
            : 100;

        // Update WPM display (hidden by default now)
        const wpmDisplay = document.getElementById('wpm-display');
        if (wpmDisplay) {
            wpmDisplay.textContent = currentWPM;
        }

        // Update accuracy display (hidden by default now)
        const accuracyDisplay = document.getElementById('accuracy-display');
        if (accuracyDisplay) {
            accuracyDisplay.textContent = `${accuracy}%`;
        }
    }

    /**
     * Update stage chevrons in the top bar
     */
    updateStageChevrons() {
        const chevronsContainer = document.getElementById('stage-chevrons');
        if (!chevronsContainer) return;

        // Clear existing chevrons
        chevronsContainer.innerHTML = '';

        // Calculate how many trophies and stars to show
        const stageNum = this.currentStage + 1;
        const stars = Math.floor(stageNum / 5);  // Every 5 stages = 1 star
        const trophies = stageNum % 5;  // Remaining stages shown as trophies

        // Add stars first
        for (let i = 0; i < stars; i++) {
            const star = document.createElement('span');
            star.className = 'stage-star';
            star.textContent = '⭐';
            chevronsContainer.appendChild(star);
        }

        // Add remaining trophies
        for (let i = 0; i < trophies; i++) {
            const trophy = document.createElement('span');
            trophy.className = 'stage-trophy';
            trophy.textContent = '🏆';
            chevronsContainer.appendChild(trophy);
        }
    }


    /**
     * Render the level
     * @param {Renderer} renderer
     * @param {number} interpolation
     */
    render(renderer, interpolation) {
        // Draw background grid (optional)
        if (window.DEBUG_MODE) {
            renderer.drawGrid();
        }

        // Draw words
        this.words.forEach(word => {
            // Smooth interpolation between previous and current position
            const x = word.prevX + (word.x - word.prevX) * interpolation;

            // Draw word text
            if (word.isActive) {
                // If word is fully typed, show all letters in green
                if (word.fullTyped) {
                    renderer.drawText(word.text, x, word.y, {
                        color: renderer.colors.success,
                        size: 'large',
                        baseline: 'middle' // Use middle baseline for better alignment
                    });
                } else {
                    // Highlight active word
                    renderer.drawText(word.text, x, word.y, {
                        color: renderer.colors.warning,
                        size: 'large',
                        baseline: 'middle'
                    });

                    // Show typed portion
                    if (word.typedIndex > 0) {
                        const typed = word.text.substring(0, word.typedIndex);
                        renderer.drawText(typed, x, word.y, {
                            color: renderer.colors.success,
                            size: 'large',
                            baseline: 'middle'
                        });
                    }
                }

                // Always show typed text below active word (even when fullTyped)
                if (this.typedText) {
                    renderer.drawText(this.typedText, x, word.y + 35, {
                        color: renderer.colors.accent,
                        size: 'large',
                        baseline: 'middle'
                    });
                }
            } else {
                // Regular word
                renderer.drawText(word.text, x, word.y, {
                    color: word.isCompleted ? renderer.colors.dim : renderer.colors.foreground,
                    size: 'large',
                    baseline: 'middle'
                });
            }
        });

        // Draw lasers (from bottom to word)
        this.lasers.forEach(laser => {
            if (laser.progress <= 1) {
                // Use the laser's dynamically updated position
                const laserX = laser.startX; // This is updated to follow the word
                const currentY = laser.startY - (laser.startY - laser.targetY) * laser.progress;
                const alpha = 1 - (laser.progress * 0.3);

                renderer.save();
                renderer.setAlpha(alpha);

                // Draw laser beam from bottom to current position
                const gradient = renderer.createGradient(
                    laserX, laser.startY,
                    laserX, currentY,
                    [
                        { offset: 0, color: '#00ff00' },
                        { offset: 0.5, color: '#ffffff' },
                        { offset: 1, color: '#00ff00' }
                    ]
                );

                renderer.ctx.fillStyle = gradient;
                renderer.ctx.fillRect(laserX - 2, currentY, 4, laser.startY - currentY);

                renderer.restore();
            }
        });

        // Draw explosions (match attract mode with bigger particles)
        this.explosions.forEach(explosion => {
            explosion.particles.forEach(particle => {
                renderer.save();
                renderer.setAlpha(particle.life);
                renderer.drawCircle(particle.x, particle.y, 3, { // Same size as attract mode
                    color: renderer.colors.warning,
                    filled: true
                });
                renderer.restore();
            });
        });

        // Draw score popups (visible but distinct from targets)
        this.scorePopups.forEach(popup => {
            renderer.save();
            renderer.setAlpha(popup.life * 0.9); // Higher opacity for better visibility

            // Add text shadow for better readability
            renderer.ctx.shadowColor = '#00ccff';
            renderer.ctx.shadowBlur = 8;

            renderer.drawText(popup.text, popup.x, popup.y, {
                color: '#00ffff', // Bright cyan, more visible
                size: 'normal', // Normal size for better readability
                align: 'center',
                baseline: 'middle'
            });

            renderer.ctx.shadowBlur = 0;
            renderer.restore();
        });

        // Draw hot streak bonus animation (when streak ends) - simplified
        if (this.hotStreakBonusAnimation) {
            renderer.save();

            const anim = this.hotStreakBonusAnimation;
            renderer.ctx.globalAlpha = anim.opacity;

            // Draw "HOT STREAK BONUS" label - smaller and less distracting
            renderer.ctx.font = `bold ${Math.floor(18 * anim.scale)}px monospace`;
            renderer.ctx.fillStyle = '#ffaa00'; // Orange
            renderer.ctx.textAlign = 'center';
            renderer.ctx.textBaseline = 'middle';
            renderer.ctx.shadowColor = '#ffaa00';
            renderer.ctx.shadowBlur = 10;
            renderer.ctx.fillText(anim.text, renderer.width / 2, anim.y - 20);

            // Draw the bonus amount - not as large
            renderer.ctx.font = `bold ${Math.floor(32 * anim.scale)}px monospace`;
            renderer.ctx.fillStyle = '#00ff00'; // Bright green for points
            renderer.ctx.shadowColor = '#00ff00';
            renderer.ctx.shadowBlur = 12;
            renderer.ctx.fillText(anim.bonusAmount, renderer.width / 2, anim.y + 15);

            // No sparkles - too distracting

            renderer.ctx.shadowBlur = 0;
            renderer.restore();
        }

        // Draw minimal hot streak indicator when active
        if (this.hotStreakActive) {
            renderer.save();

            // Determine current multiplier level and color
            let streakColor = '#ffaa00'; // Orange default
            let currentMultiplier = '1.25x';
            if (this.hotStreakCounter >= 50) {
                streakColor = '#ff00ff'; // Magenta
                currentMultiplier = '3x';
            } else if (this.hotStreakCounter >= 30) {
                streakColor = '#ff0000'; // Red
                currentMultiplier = '2x';
            } else if (this.hotStreakCounter >= 20) {
                streakColor = '#ffff00'; // Yellow
                currentMultiplier = '1.5x';
            }

            // Position below score on the left
            const leftX = 20;
            const topY = 90;

            // Subtle pulsing
            const pulseTime = (Date.now() - this.hotStreakStartTime) / 1000;
            const pulseAlpha = 0.7 + Math.sin(pulseTime * 4) * 0.3;

            // Draw a simple, clean indicator - just text, no box
            renderer.ctx.globalAlpha = pulseAlpha;

            // Small flame icon and counter in one line
            renderer.ctx.font = 'bold 18px monospace';
            renderer.ctx.fillStyle = streakColor;
            renderer.ctx.textAlign = 'left';
            renderer.ctx.textBaseline = 'middle';

            // Add subtle glow
            renderer.ctx.shadowColor = streakColor;
            renderer.ctx.shadowBlur = 8;

            // Draw compact indicator: 🔥 HOT STREAK 25
            const indicatorText = `🔥 HOT STREAK ${this.hotStreakCounter}`;
            renderer.ctx.fillText(indicatorText, leftX, topY);

            renderer.ctx.shadowBlur = 0;
            renderer.restore();
        }

        // Draw clean multiplier announcement (when it changes)
        if (this.hotStreakMultiplierDisplay) {
            renderer.save();

            const display = this.hotStreakMultiplierDisplay;
            const centerX = renderer.width / 2;
            const centerY = renderer.height / 2 - 100; // Above center

            // Smooth fade in/out
            let opacity = 1;
            if (display.timer > 2.5) {
                // Fade in for first 0.5 seconds
                opacity = (3.0 - display.timer) / 0.5;
            } else if (display.timer < 0.5) {
                // Fade out in last 0.5 seconds
                opacity = display.timer / 0.5;
            }

            renderer.ctx.globalAlpha = opacity * 0.9;

            // Draw just the text, large and clear
            const fontSize = Math.floor(36 + (display.scale - 1) * 12);
            renderer.ctx.font = `bold ${fontSize}px monospace`;
            renderer.ctx.fillStyle = display.color;
            renderer.ctx.textAlign = 'center';
            renderer.ctx.textBaseline = 'middle';

            // Subtle glow
            renderer.ctx.shadowColor = display.color;
            renderer.ctx.shadowBlur = 20;

            // Simple text, no "MULTIPLIER!" - just the number
            const multiplierText = display.text.replace(' MULTIPLIER!', '');
            renderer.ctx.fillText(multiplierText, centerX, centerY);

            // Add "MULTIPLIER" below in smaller text
            renderer.ctx.font = '20px monospace';
            renderer.ctx.globalAlpha = opacity * 0.7;
            renderer.ctx.fillText('MULTIPLIER', centerX, centerY + 35);

            renderer.ctx.shadowBlur = 0;
            renderer.restore();
        }

        // Draw progress to unlock (if close)
        if (this.sustainedSeconds > 0 && !this.levelCompleted) {
            const progress = (this.sustainedSeconds / this.requiredSustainTime) * 100;
            renderer.drawText(`Unlock Progress: ${Math.round(progress)}%`,
                renderer.width / 2, 120, {
                color: renderer.colors.success,
                size: 'small',
                align: 'center'
            });
        }


        // Draw stage notification (temporary)
        if (this.stageNotification && this.stageNotification.timer > 0) {
            const opacity = Math.min(1, this.stageNotification.timer);
            renderer.save();
            renderer.setAlpha(opacity);

            // More granular responsive text sizing
            let fontSize = 32; // Base font size for custom sizing
            const padding = renderer.width < 600 ? 40 : 80;

            if (renderer.width < 400) {
                fontSize = 16;
            } else if (renderer.width < 500) {
                fontSize = 20;
            } else if (renderer.width < 700) {
                fontSize = 24;
            } else {
                fontSize = 32;
            }

            // Use custom font size for better responsiveness
            const originalFont = renderer.ctx.font;
            renderer.ctx.font = `${fontSize}px monospace`;

            // Measure text with actual font
            const textWidth = renderer.ctx.measureText(this.stageNotification.text).width;

            // If text is still too wide, scale down the font
            if (textWidth > renderer.width - 60) {
                fontSize = fontSize * ((renderer.width - 60) / textWidth);
                renderer.ctx.font = `${fontSize}px monospace`;
            }

            // Draw notification background - responsive width
            const notifWidth = Math.min(renderer.width - 40, renderer.ctx.measureText(this.stageNotification.text).width + padding);
            const notifHeight = Math.max(fontSize * 2.5, renderer.width < 600 ? 60 : 80);
            const notifY = renderer.height / 2 - notifHeight / 2 - 50; // Center vertically

            renderer.drawRect(renderer.width / 2 - notifWidth / 2, notifY, notifWidth, notifHeight, {
                color: 'rgba(0, 0, 0, 0.95)',
                filled: true
            });
            renderer.drawRect(renderer.width / 2 - notifWidth / 2, notifY, notifWidth, notifHeight, {
                color: renderer.colors.success,
                filled: false,
                lineWidth: 3
            });

            // Add glow effect
            renderer.ctx.shadowColor = renderer.colors.success;
            renderer.ctx.shadowBlur = 20;

            // Draw notification text with custom font size
            renderer.ctx.fillStyle = renderer.colors.success;
            renderer.ctx.textAlign = 'center';
            renderer.ctx.textBaseline = 'middle';
            renderer.ctx.fillText(this.stageNotification.text,
                renderer.width / 2, notifY + notifHeight / 2);

            // Reset shadow and font
            renderer.ctx.shadowBlur = 0;
            renderer.ctx.font = originalFont;

            renderer.restore();
        }


        // Draw simple instruction at top
        if (this.showInstruction && this.instructionOpacity > 0) {
            renderer.save();
            renderer.setAlpha(this.instructionOpacity);

            // Draw instruction text
            const text = "Type the yellow moving letters";
            const textY = 140;

            // Responsive sizing
            const textSize = renderer.width < 600 ? 'normal' : 'large';
            const boxPadding = renderer.width < 600 ? 15 : 20;

            // Draw text background for better visibility - responsive
            const textWidth = renderer.measureText(text, textSize);
            const boxWidth = Math.min(renderer.width - 20, textWidth + boxPadding * 2);
            const boxHeight = renderer.width < 600 ? 35 : 40;

            // Draw box background (opacity is applied to both box and text via setAlpha)
            renderer.drawRect(renderer.width / 2 - boxWidth / 2, textY - boxHeight/2, boxWidth, boxHeight, {
                color: 'rgba(0, 0, 0, 0.7)',
                filled: true
            });

            // Draw the instruction text (opacity is applied via setAlpha)
            renderer.drawText(text, renderer.width / 2, textY, {
                color: renderer.colors.warning,
                size: textSize,
                align: 'center',
                baseline: 'middle'
            });

            renderer.restore();
        }

        // Draw score submission interstitial
        if (this.scoreSubmissionState) {
            this.renderScoreSubmission(renderer);
        }

        // Draw game over message
        if (this.gameOver && !this.scoreSubmissionState) {
            renderer.drawRect(0, 0, renderer.width, renderer.height, {
                color: 'rgba(0, 0, 0, 0.8)',
                filled: true
            });

            // Draw "GAME OVER" in large text
            renderer.ctx.save();
            renderer.ctx.font = 'bold 48px monospace';
            renderer.ctx.fillStyle = '#ff0000';
            renderer.ctx.textAlign = 'center';
            renderer.ctx.textBaseline = 'middle';
            renderer.ctx.shadowColor = '#ff0000';
            renderer.ctx.shadowBlur = 20;
            renderer.ctx.fillText('GAME OVER', renderer.width / 2, renderer.height / 2 - 80);
            renderer.ctx.restore();

            // Draw final score
            renderer.ctx.save();
            renderer.ctx.font = 'bold 36px monospace';
            renderer.ctx.fillStyle = '#00ff00';
            renderer.ctx.textAlign = 'center';
            renderer.ctx.textBaseline = 'middle';
            renderer.ctx.shadowColor = '#00ff00';
            renderer.ctx.shadowBlur = 15;
            const scoreText = `FINAL SCORE: ${this.score.toString().padStart(7, '0')}`;
            renderer.ctx.fillText(scoreText, renderer.width / 2, renderer.height / 2 - 20);
            renderer.ctx.restore();

            // Draw restart instructions
            renderer.drawText('Press R to restart', renderer.width / 2, renderer.height / 2 + 50, {
                color: renderer.colors.dim,
                size: 'normal',
                align: 'center'
            });

            renderer.drawText('Press ESC to quit to main menu', renderer.width / 2, renderer.height / 2 + 80, {
                color: renderer.colors.dim,
                size: 'normal',
                align: 'center'
            });
        }

        // Draw level complete message
        if (this.levelCompleted) {
            renderer.drawRect(0, 0, renderer.width, renderer.height, {
                color: 'rgba(0, 0, 0, 0.7)',
                filled: true
            });

            renderer.drawText('LEVEL COMPLETE!', renderer.width / 2, renderer.height / 2 - 50, {
                color: renderer.colors.success,
                size: 'huge',
                align: 'center'
            });

            renderer.drawText('Vim Mode Unlocked!', renderer.width / 2, renderer.height / 2, {
                color: renderer.colors.warning,
                size: 'large',
                align: 'center'
            });

            renderer.drawText('Transitioning...', renderer.width / 2, renderer.height / 2 + 50, {
                color: renderer.colors.accent,
                size: 'normal',
                align: 'center'
            });
        }
    }

    /**
     * Render score submission interstitial
     * @param {Renderer} renderer
     */
    renderScoreSubmission(renderer) {
        const state = this.scoreSubmissionState;
        if (!state) return;

        const fadeAlpha = state.fadeIn;

        // Draw full black overlay - classic arcade style
        renderer.save();
        renderer.setAlpha(fadeAlpha);
        renderer.drawRect(0, 0, renderer.width, renderer.height, {
            color: '#000000',
            filled: true
        });
        renderer.restore();

        renderer.save();
        renderer.setAlpha(fadeAlpha);

        // Classic arcade title with flashing effect
        const flashOn = Math.floor(Date.now() / 500) % 2 === 0;
        const titleY = renderer.height * 0.20;

        // Draw "NEW HIGH SCORE" or success message in classic arcade style
        const title = state.status === 'success' ? 'GREAT JOB!' : 'HIGH SCORE';
        const titleColor = flashOn ? '#ffff00' : '#ff0000';

        // Create a pulsing glow effect
        renderer.ctx.save();
        renderer.ctx.shadowColor = titleColor;
        renderer.ctx.shadowBlur = flashOn ? 30 : 15;

        // Draw title in large arcade font
        renderer.ctx.font = 'bold 48px monospace';
        renderer.ctx.fillStyle = titleColor;
        renderer.ctx.textAlign = 'center';
        renderer.ctx.textBaseline = 'middle';
        renderer.ctx.fillText(title, renderer.width / 2, titleY);

        renderer.ctx.shadowBlur = 0;
        renderer.ctx.restore();

        // Draw score in HUGE arcade numbers with digital display effect
        const scoreY = titleY + 70;

        // Use the actual arcade score from the session data
        const scoreValue = state.sessionData.score || this.score || 0;

        // Draw score with digital display background
        const scoreText = scoreValue.toString().padStart(7, '0');
        renderer.ctx.save();

        // Draw dark background for digital display effect
        renderer.ctx.fillStyle = '#111111';
        renderer.ctx.fillRect(renderer.width / 2 - 140, scoreY - 30, 280, 60);

        // Draw border around score
        renderer.ctx.strokeStyle = '#00ff00';
        renderer.ctx.lineWidth = 2;
        renderer.ctx.strokeRect(renderer.width / 2 - 140, scoreY - 30, 280, 60);

        // Draw the score with green digital display color
        renderer.ctx.font = 'bold 48px monospace';
        renderer.ctx.fillStyle = '#00ff00';
        renderer.ctx.textAlign = 'center';
        renderer.ctx.textBaseline = 'middle';
        renderer.ctx.shadowColor = '#00ff00';
        renderer.ctx.shadowBlur = 10;
        renderer.ctx.fillText(scoreText, renderer.width / 2, scoreY);
        renderer.ctx.restore();

        // Draw stage indicator only
        const statsY = scoreY + 70;

        renderer.ctx.save();
        renderer.ctx.font = '24px monospace';
        renderer.ctx.fillStyle = '#ffaa00';
        renderer.ctx.textAlign = 'center';
        renderer.ctx.shadowColor = '#ffaa00';
        renderer.ctx.shadowBlur = 10;
        renderer.ctx.fillText(`STAGE ${state.sessionData.stage || (this.currentStage + 1)}`, renderer.width / 2, statsY);
        renderer.ctx.restore();

        // Draw initials entry section
        const initialsY = statsY + 80;

        if (state.status === 'input') {
            // Classic blinking "ENTER YOUR INITIALS" prompt
            const blinkPrompt = Math.floor(Date.now() / 700) % 2 === 0;

            if (blinkPrompt) {
                renderer.ctx.save();
                renderer.ctx.font = 'bold 28px monospace';
                renderer.ctx.fillStyle = '#ffff00';
                renderer.ctx.textAlign = 'center';
                renderer.ctx.shadowColor = '#ffff00';
                renderer.ctx.shadowBlur = 15;
                renderer.ctx.fillText('ENTER YOUR INITIALS', renderer.width / 2, initialsY);
                renderer.ctx.restore();
            }
        }

        // Draw classic arcade initial entry boxes
        const boxSize = 60;
        const boxSpacing = 20;
        const totalWidth = (boxSize * 3) + (boxSpacing * 2);
        const startX = (renderer.width - totalWidth) / 2;
        const boxesY = initialsY + 40;

        for (let i = 0; i < 3; i++) {
            const x = startX + (i * (boxSize + boxSpacing));

            // Draw box background
            renderer.ctx.save();
            renderer.ctx.fillStyle = '#111111';
            renderer.ctx.fillRect(x, boxesY, boxSize, boxSize);

            // Draw box border with color based on state
            const borderColor = i < this.submissionInitials.length ? '#00ff00' :
                               (i === this.submissionInitials.length ? '#ffff00' : '#444444');
            renderer.ctx.strokeStyle = borderColor;
            renderer.ctx.lineWidth = 3;
            renderer.ctx.strokeRect(x, boxesY, boxSize, boxSize);

            // Draw letter if exists
            if (i < this.submissionInitials.length) {
                renderer.ctx.font = 'bold 40px monospace';
                renderer.ctx.fillStyle = '#00ff00';
                renderer.ctx.textAlign = 'center';
                renderer.ctx.textBaseline = 'middle';
                renderer.ctx.shadowColor = '#00ff00';
                renderer.ctx.shadowBlur = 10;
                renderer.ctx.fillText(this.submissionInitials[i], x + boxSize / 2, boxesY + boxSize / 2);
            } else if (i === this.submissionInitials.length && state.status === 'input') {
                // Draw blinking underscore cursor
                const cursorVisible = Math.floor(this.submissionCursorBlink * 2) % 2 === 0;
                if (cursorVisible) {
                    renderer.ctx.fillStyle = '#ffffff';
                    renderer.ctx.fillRect(x + 15, boxesY + boxSize - 15, boxSize - 30, 4);
                }
            } else {
                // Draw dim underscore for empty slots
                renderer.ctx.fillStyle = '#333333';
                renderer.ctx.fillRect(x + 15, boxesY + boxSize - 15, boxSize - 30, 4);
            }

            renderer.ctx.restore();
        }

        // Draw status messages with arcade styling
        const messageY = boxesY + boxSize + 40;

        if (state.status === 'submitting') {
            // Animated dots for submitting
            const dots = '.'.repeat((Math.floor(Date.now() / 500) % 3) + 1);
            renderer.ctx.save();
            renderer.ctx.font = '20px monospace';
            renderer.ctx.fillStyle = '#00aaff';
            renderer.ctx.textAlign = 'center';
            renderer.ctx.fillText(`TRANSMITTING${dots}`, renderer.width / 2, messageY);
            renderer.ctx.restore();
        } else if (state.status === 'success') {
            // Success message with flashing
            const successFlash = Math.floor(Date.now() / 300) % 2 === 0;
            renderer.ctx.save();
            renderer.ctx.font = 'bold 28px monospace';
            renderer.ctx.fillStyle = successFlash ? '#00ff00' : '#ffffff';
            renderer.ctx.textAlign = 'center';
            renderer.ctx.shadowColor = '#00ff00';
            renderer.ctx.shadowBlur = 20;
            renderer.ctx.fillText('SCORE RECORDED!', renderer.width / 2, messageY);
            renderer.ctx.restore();
        } else if (state.status === 'error' || this.submissionError) {
            // Error message
            const errorMsg = this.submissionError || 'TRANSMISSION FAILED';
            renderer.ctx.save();
            renderer.ctx.font = '20px monospace';
            renderer.ctx.fillStyle = '#ff4444';
            renderer.ctx.textAlign = 'center';
            renderer.ctx.fillText(errorMsg, renderer.width / 2, messageY);
            renderer.ctx.restore();
        }

        // Draw instructions at the bottom (only during input)
        if (state.status === 'input') {
            const instructY = renderer.height - 60;
            renderer.ctx.save();
            renderer.ctx.font = '16px monospace';
            renderer.ctx.fillStyle = '#888888';
            renderer.ctx.textAlign = 'center';
            renderer.ctx.fillText('PRESS ENTER TO SUBMIT', renderer.width / 2, instructY);
            renderer.ctx.restore();
        }

        renderer.restore();
    }

    /**
     * Clear all pending timers
     */
    clearAllTimers() {
        // Clear all pending laser timers
        if (this.pendingLaserTimers && this.pendingLaserTimers.length > 0) {
            this.pendingLaserTimers.forEach(timerId => {
                clearTimeout(timerId);
            });
            this.pendingLaserTimers = [];
        }

        // Clear any timers attached to words
        if (this.words) {
            this.words.forEach(word => {
                if (word.laserTimers && word.laserTimers.length > 0) {
                    word.laserTimers.forEach(timerId => {
                        clearTimeout(timerId);
                    });
                    word.laserTimers = [];
                }
            });
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        // Clear all timers before destroying
        this.clearAllTimers();

        // Stop high score fanfare if playing
        if (this.highScoreFanfareStop) {
            this.highScoreFanfareStop();
            this.highScoreFanfareStop = null;
        }

        // Stop hot streak music if playing
        if (this.hotStreakMusicStop) {
            this.hotStreakMusicStop();
            this.hotStreakMusicStop = null;
        }

        if (this.keyHandler) {
            this.game.keyboard.off('keydown', this.keyHandler);
        }
    }
}

// Export for use
window.TypingLevel = TypingLevel;
