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
        this.spawnInterval = 2.5; // seconds between word spawns
        this.baseSpeed = 40; // pixels per second (slower start)
        this.currentSpeed = this.baseSpeed;

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

        // Difficulty progression
        this.currentStage = 0;
        this.stages = [
            { name: 'homeKeys', difficulty: 'letters', wordsToPass: 10 },
            { name: 'homeKeys', difficulty: 'short', wordsToPass: 15 },
            { name: 'homeKeys', difficulty: 'medium', wordsToPass: 15 },
            { name: 'easyKeys', difficulty: 'short', wordsToPass: 20 },
            { name: 'easyKeys', difficulty: 'medium', wordsToPass: 20 },
            { name: 'allKeys', difficulty: 'short', wordsToPass: 20 },
            { name: 'allKeys', difficulty: 'medium', wordsToPass: 25 },
            { name: 'allKeys', difficulty: 'mixed', wordsToPass: 30 }
        ];
        this.wordsInCurrentStage = 0;

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
        this.totalKeystrokes = 0;
        this.correctKeystrokes = 0;
        this.charactersTyped = 0;
        this.wordsCompleted = 0;
        this.wpmHistory = [];
        this.accuracyHistory = [];
        this.sustainedSeconds = 0;
        this.lasers = [];
        this.explosions = [];
        this.currentStage = 0;
        this.wordsInCurrentStage = 0;
        this.currentSpeed = this.baseSpeed;
        this.levelCompleted = false;
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

        // Update spawn timer
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnWord();
            this.spawnTimer = 0;
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

        // Choose a lane different from the last one to avoid overlap
        let lane;
        do {
            lane = Math.floor(Math.random() * this.lanes.length);
        } while (lane === this.lastLane && this.lanes.length > 1);
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

        // Create laser effect FROM BOTTOM - target the actual rendered position
        // Use the current interpolated position for accurate targeting
        const targetX = word.x + word.width / 2;
        this.createLaser(targetX, word.y, word);

        // Play laser sound
        window.AudioManager.playLaser();

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
        // Just continue playing - no game over
    }


    /**
     * Create laser effect FROM BOTTOM OF SCREEN
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     * @param {Object} targetWord - The word being targeted
     */
    createLaser(targetX, targetY, targetWord) {
        // Laser shoots from bottom of screen to the word
        this.lasers.push({
            startX: targetX,
            startY: this.game.renderer.height,
            targetX: targetX,
            targetY: targetY,
            targetWord: targetWord,
            progress: 0,
            speed: 3, // Progress speed (0 to 1)
            hasHit: false
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

            // Update laser target position to follow the moving word
            if (laser.targetWord && !laser.hasHit) {
                laser.targetX = laser.targetWord.x + laser.targetWord.width / 2;
            }

            // When laser reaches target, create explosion
            if (laser.progress >= 1 && !laser.hasHit) {
                laser.hasHit = true;

                // Create explosion at the word's current position
                if (laser.targetWord) {
                    const explosionX = laser.targetWord.x + laser.targetWord.width / 2;
                    this.createExplosion(explosionX, laser.targetY);

                    // IMMEDIATELY remove the word
                    const index = this.words.indexOf(laser.targetWord);
                    if (index !== -1) {
                        this.words.splice(index, 1);
                    }
                } else {
                    this.createExplosion(laser.targetX, laser.targetY);
                }

                window.AudioManager.playExplosion();
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
            if (this.currentStage < this.stages.length - 1) {
                this.currentStage++;
                this.wordsInCurrentStage = 0;

                // Gradually increase speed with each stage
                this.currentSpeed = this.baseSpeed * (1 + this.currentStage * 0.15);

                // Slightly decrease spawn interval for more challenge
                this.spawnInterval = Math.max(1.5, 2.5 - this.currentStage * 0.1);

                const newStage = this.stages[this.currentStage];
                Utils.log.info(`Advanced to stage: ${newStage.name} - ${newStage.difficulty}`);
            }
        }
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
                        size: 'large'
                    });
                } else {
                    // Highlight active word
                    renderer.drawText(word.text, x, word.y, {
                        color: renderer.colors.warning,
                        size: 'large'
                    });

                    // Show typed portion
                    if (word.typedIndex > 0) {
                        const typed = word.text.substring(0, word.typedIndex);
                        renderer.drawText(typed, x, word.y, {
                            color: renderer.colors.success,
                            size: 'large'
                        });
                    }
                }

                // Always show typed text below active word (even when fullTyped)
                if (this.typedText) {
                    renderer.drawText(this.typedText, x, word.y + 30, {
                        color: renderer.colors.accent,
                        size: 'normal'
                    });
                }
            } else {
                // Regular word
                renderer.drawText(word.text, x, word.y, {
                    color: word.isCompleted ? renderer.colors.dim : renderer.colors.foreground,
                    size: 'large'
                });
            }
        });

        // Draw lasers (from bottom to word)
        this.lasers.forEach(laser => {
            if (laser.progress <= 1) {
                // Update target position if word is still moving
                let targetX = laser.targetX;
                if (laser.targetWord) {
                    // Use interpolated position for smooth tracking
                    targetX = laser.targetWord.prevX + (laser.targetWord.x - laser.targetWord.prevX) * interpolation + laser.targetWord.width / 2;
                }

                const currentY = laser.startY - (laser.startY - laser.targetY) * laser.progress;
                const alpha = 1 - (laser.progress * 0.3);

                renderer.save();
                renderer.setAlpha(alpha);

                // Draw laser beam from bottom to current position
                const gradient = renderer.createGradient(
                    targetX, laser.startY,
                    targetX, currentY,
                    [
                        { offset: 0, color: '#00ff00' },
                        { offset: 0.5, color: '#ffffff' },
                        { offset: 1, color: '#00ff00' }
                    ]
                );

                renderer.ctx.fillStyle = gradient;
                renderer.ctx.fillRect(targetX - 2, currentY, 4, laser.startY - currentY);

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