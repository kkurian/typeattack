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

        // Adaptive difficulty for struggling players
        this.missedWords = 0;
        this.recentMisses = [];
        this.recoveryMode = false;
        this.recoveryTimer = 0;
        this.normalSpeed = this.baseSpeed;
        this.normalSpawnInterval = this.baseSpawnInterval;

        // Statistics
        this.totalKeystrokes = 0;
        this.correctKeystrokes = 0;
        this.startTime = 0;
        this.charactersTyped = 0;
        this.wordsCompleted = 0;

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

        // Vertical positioning lanes
        this.lanes = [0.3, 0.4, 0.5, 0.6, 0.7]; // Percentage of screen height
        this.lastLane = 0;

        // Keyboard handler
        this.keyHandler = null;

        // Level complete flag
        this.levelCompleted = false;

        // Simple instruction display
        this.showInstruction = false;
        this.instructionOpacity = 0;
        this.instructionFadingIn = false;

        // Flag to prevent spawning during stage notifications
        this.spawningEnabled = true;
    }

    /**
     * Initialize the level
     */
    init() {
        this.reset();
        this.startTime = Date.now();

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
        this.currentStageDescription = this.stages[0].description;
        this.showStageNotification(this.stages[0].description, true, 1); // true = intro, 1 = stage number

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
        this.words = [];
        this.activeWordIndex = -1;
        this.typedText = '';
        this.score = 0;
        this.streak = 0;
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
        this.wpmHistory = [];
        this.accuracyHistory = [];
        this.sustainedSeconds = 0;
        this.lasers = [];
        this.explosions = [];
        this.wordsInCurrentStage = 0;
        this.currentSpeed = this.baseSpeed;
        this.levelCompleted = false;
        this.currentStageDescription = this.stages[0].description;
        this.stageNotification = null;
        this.missedWords = 0;
        this.recentMisses = [];
        this.recoveryMode = false;
        this.recoveryTimer = 0;

        // Reset instruction display
        this.showInstruction = false;  // Will be set properly in init()
        this.instructionOpacity = 0;
        this.instructionFadingIn = false;

        // Reset spawning flag
        this.spawningEnabled = true;
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
        if (this.levelCompleted) {
            this.updateLevelCompleteAnimation(deltaTime);
            return;
        }

        // Update recovery mode
        if (this.recoveryMode) {
            this.recoveryTimer -= deltaTime;

            // Exit recovery mode when timer expires or player catches up
            if (this.recoveryTimer <= 0) {
                this.exitRecoveryMode();
            } else {
                // Also exit if player successfully completes several words in recovery
                // Check if they completed 3 words without missing any
                const activeWords = this.words.filter(w => !w.isCompleted).length;
                if (activeWords <= 1 && this.streak >= 3) {
                    this.exitRecoveryMode();
                }
            }
        }

        // Update stage notification timer
        if (this.stageNotification && this.stageNotification.timer > 0) {
            this.stageNotification.timer -= deltaTime;
            if (this.stageNotification.timer <= 0) {
                this.stageNotification = null;
            }
        }

        // Update recovery notification timer
        if (this.recoveryNotification && this.recoveryNotification.timer > 0) {
            this.recoveryNotification.timer -= deltaTime;
            if (this.recoveryNotification.timer <= 0) {
                this.recoveryNotification = null;
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

        // Update typing speed tracking (but not during recovery mode)
        if (!this.recoveryMode) {
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

            // Play keystroke sound
            window.AudioManager.playKeystroke();

            // Register correct input (resets error cooldown)
            this.game.keyboard.registerCorrect();

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
            // Incorrect keystroke
            this.streak = 0;
            window.AudioManager.playError();

            // Register error for cooldown tracking
            this.game.keyboard.registerError();
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
        this.score += word.text.length * 10 * Math.max(1, Math.floor(this.streak / 5));

        // Clear typed text now that the word is complete
        this.typedText = '';

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

        for (let i = 0; i < word.text.length; i++) {
            // Stagger the lasers slightly for a cooler effect
            setTimeout(() => {
                // Create laser that will track the moving word
                this.createLaser(word, i, charWidth);

                // Play laser sound for each beam
                window.AudioManager.playLaser();
            }, i * 30); // 30ms delay between each laser
        }

        // Check difficulty progression
        this.updateDifficulty();
    }

    /**
     * Handle word reaching right edge
     * @param {Object} word
     */
    wordReachedEdge(word) {
        this.streak = 0;
        window.AudioManager.playError();

        // Clear typed text if this was the active word
        if (word.isActive) {
            this.typedText = '';
        }

        // Track missed words for adaptive difficulty
        this.missedWords++;
        this.recentMisses.push(Date.now());

        // Keep only recent misses (last 10 seconds)
        const tenSecondsAgo = Date.now() - 10000;
        this.recentMisses = this.recentMisses.filter(time => time > tenSecondsAgo);

        // Check if player is struggling (3+ misses in 10 seconds)
        if (this.recentMisses.length >= 3 && !this.recoveryMode) {
            this.enterRecoveryMode();
        }

        // Just continue playing - no game over
    }

    /**
     * Enter recovery mode to help struggling players
     */
    enterRecoveryMode() {
        this.recoveryMode = true;
        this.recoveryTimer = 10.0; // 10 seconds of easier gameplay

        // Store normal values
        this.normalSpeed = this.currentSpeed;
        this.normalSpawnInterval = this.spawnInterval;

        // Make game easier
        this.currentSpeed = this.currentSpeed * 0.6; // 60% speed
        this.spawnInterval = this.spawnInterval * 1.5; // 50% slower spawning
        this.baseSpawnInterval = this.baseSpawnInterval * 1.5;

        // Clear some words to give breathing room
        if (this.words.length > 2) {
            // Remove the leftmost (oldest) words except the rightmost 2
            this.words.sort((a, b) => b.x - a.x);
            this.words = this.words.slice(0, 2);
        }

        // Show recovery notification
        this.recoveryNotification = {
            text: "Slowing down to help you catch up!",
            timer: 3.0
        };

        Utils.log.info('Recovery mode activated - slowing down');
    }

    /**
     * Exit recovery mode
     */
    exitRecoveryMode() {
        this.recoveryMode = false;
        this.recoveryTimer = 0;

        // Gradually return to normal speed
        this.currentSpeed = this.normalSpeed;
        this.spawnInterval = this.normalSpawnInterval;
        this.baseSpawnInterval = this.baseSpawnInterval / 1.5;

        // Clear recent misses
        this.recentMisses = [];

        Utils.log.info('Recovery mode ended - returning to normal');
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
        for (let i = 0; i < 15; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 300,
                vy: (Math.random() - 0.5) * 300,
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

                // Only remove the word when the LAST laser hits
                if (laser.targetWord && laser.isLastLaser) {
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
            if (timeMinutes > 0) {
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
                this.game.updateProficiency('typing', proficiency);
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
        // Calculate stats
        const timeMinutes = Math.max(0.01, (Date.now() - this.startTime) / 60000);
        const currentWPM = Math.round((this.charactersTyped / 5) / timeMinutes);
        const accuracy = this.totalKeystrokes > 0
            ? Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100)
            : 100;

        // Update WPM display
        const wpmDisplay = document.getElementById('wpm-display');
        if (wpmDisplay) {
            wpmDisplay.textContent = currentWPM;
        }

        // Update accuracy display
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

        // Draw explosions
        this.explosions.forEach(explosion => {
            explosion.particles.forEach(particle => {
                renderer.save();
                renderer.setAlpha(particle.life);
                renderer.drawCircle(particle.x, particle.y, 3, {
                    color: renderer.colors.warning,
                    filled: true
                });
                renderer.restore();
            });
        });

        // Draw recovery mode indicator
        if (this.recoveryMode) {
            // Draw subtle background tint
            renderer.save();
            renderer.setAlpha(0.1);
            renderer.drawRect(0, 0, renderer.width, renderer.height, {
                color: '#0066ff',
                filled: true
            });
            renderer.restore();

            // Draw recovery mode text
            const recoveryText = "Recovery Mode - Take your time!";
            const timerText = `${Math.ceil(this.recoveryTimer)}s`;

            renderer.drawText(recoveryText,
                renderer.width / 2, 100, {
                color: '#00aaff',
                size: 'normal',
                align: 'center',
                baseline: 'middle'
            });

            renderer.drawText(timerText,
                renderer.width / 2, 120, {
                color: '#00aaff',
                size: 'small',
                align: 'center',
                baseline: 'middle'
            });
        }

        // Draw progress to unlock (if close and not in recovery)
        if (this.sustainedSeconds > 0 && !this.levelCompleted && !this.recoveryMode) {
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

        // Draw recovery notification (temporary)
        if (this.recoveryNotification && this.recoveryNotification.timer > 0) {
            const opacity = Math.min(1, this.recoveryNotification.timer);
            renderer.save();
            renderer.setAlpha(opacity);

            // Draw notification with calming blue color
            const notifWidth = renderer.measureText(this.recoveryNotification.text, 'large') + 60;
            const notifHeight = 60;
            const notifY = 200;

            renderer.drawRect(renderer.width / 2 - notifWidth / 2, notifY, notifWidth, notifHeight, {
                color: 'rgba(0, 50, 100, 0.95)',
                filled: true
            });
            renderer.drawRect(renderer.width / 2 - notifWidth / 2, notifY, notifWidth, notifHeight, {
                color: '#00aaff',
                filled: false,
                lineWidth: 2
            });

            renderer.drawText(this.recoveryNotification.text,
                renderer.width / 2, notifY + notifHeight / 2, {
                color: '#00aaff',
                size: 'large',
                align: 'center',
                baseline: 'middle'
            });

            renderer.restore();
        }

        // Draw simple instruction at top
        if (this.showInstruction && this.instructionOpacity > 0) {
            renderer.save();
            renderer.setAlpha(this.instructionOpacity);

            // Draw instruction text
            const text = "Type the moving letters";
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
     * Cleanup
     */
    destroy() {
        if (this.keyHandler) {
            this.game.keyboard.off('keydown', this.keyHandler);
        }
    }
}

// Export for use
window.TypingLevel = TypingLevel;