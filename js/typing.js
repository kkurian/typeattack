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
        this.lives = 3;

        // Timing
        this.spawnTimer = 0;
        this.spawnInterval = 2; // seconds between word spawns
        this.baseSpeed = 50; // pixels per second
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
        this.difficulty = 'letters'; // letters, short, long
        this.difficultyProgress = 0;

        // Visual effects
        this.lasers = [];
        this.explosions = [];

        // Keyboard handler
        this.keyHandler = null;
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
        this.lives = 3;
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
        // Update spawn timer
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnWord();
            this.spawnTimer = 0;
        }

        // Update words
        for (let i = this.words.length - 1; i >= 0; i--) {
            const word = this.words[i];
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

        const word = {
            id: Utils.generateId(),
            text: text,
            typedIndex: 0,
            x: -100, // Start off-screen left
            y: this.game.renderer.height / 2,
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
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        const shortWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her'];
        const longWords = ['javascript', 'function', 'variable', 'constant', 'typescript', 'programming'];

        switch (this.difficulty) {
            case 'letters':
                return letters[Math.floor(Math.random() * letters.length)];

            case 'short':
                return Utils.randomElement(shortWords);

            case 'long':
                return Utils.randomElement(longWords);

            default:
                return Utils.randomElement(shortWords);
        }
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
        if (this.activeWordIndex === -1) return;

        const activeWord = this.words[this.activeWordIndex];
        if (!activeWord || activeWord.isCompleted) return;

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
                this.completeWord(activeWord);
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
        this.score += word.text.length * 10;
        this.typedText = '';

        // Create laser effect
        this.createLaser(word.x + word.width / 2, word.y);

        // Play laser sound
        window.AudioManager.playLaser();

        // Remove word after short delay
        setTimeout(() => {
            const index = this.words.indexOf(word);
            if (index !== -1) {
                this.createExplosion(word.x + word.width / 2, word.y);
                window.AudioManager.playExplosion();
                this.words.splice(index, 1);
            }
        }, 100);

        // Update difficulty progression
        this.updateDifficulty();
    }

    /**
     * Handle word reaching right edge
     * @param {Object} word
     */
    wordReachedEdge(word) {
        this.lives--;
        this.streak = 0;

        window.AudioManager.playError();

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    /**
     * Create laser effect
     * @param {number} x
     * @param {number} y
     */
    createLaser(x, y) {
        this.lasers.push({
            x: x,
            y: y,
            speed: 500,
            life: 1
        });
    }

    /**
     * Create explosion effect
     * @param {number} x
     * @param {number} y
     */
    createExplosion(x, y) {
        const particles = [];
        for (let i = 0; i < 10; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
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
            laser.y -= laser.speed * deltaTime;
            laser.life -= deltaTime * 2;

            if (laser.life <= 0 || laser.y < 0) {
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
        this.difficultyProgress++;

        // Progress through difficulties
        if (this.difficulty === 'letters' && this.difficultyProgress >= 10) {
            this.difficulty = 'short';
            this.difficultyProgress = 0;
            this.currentSpeed = this.baseSpeed * 1.2;
            Utils.log.info('Difficulty increased to short words');
        } else if (this.difficulty === 'short' && this.difficultyProgress >= 20) {
            this.difficulty = 'long';
            this.difficultyProgress = 0;
            this.currentSpeed = this.baseSpeed * 1.5;
            Utils.log.info('Difficulty increased to long words');
        }

        // Gradually increase speed
        if (this.wordsCompleted % 5 === 0) {
            this.currentSpeed *= 1.05;
            this.spawnInterval = Math.max(1, this.spawnInterval * 0.95);
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

                    if (this.sustainedSeconds >= this.requiredSustainTime) {
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
        this.game.updateProficiency('typing', 80);
        window.AudioManager.playLevelComplete();
        Utils.log.info('Typing level completed - 48 WPM sustained for 1 minute!');
    }

    /**
     * Update UI elements
     */
    updateUI() {
        // Update WPM
        const timeMinutes = Math.max(0.01, (Date.now() - this.startTime) / 60000);
        const currentWPM = Math.round((this.charactersTyped / 5) / timeMinutes);
        const wpmElement = document.getElementById('wpm');
        if (wpmElement) {
            wpmElement.textContent = `${currentWPM} WPM`;
        }

        // Update accuracy
        const accuracy = this.totalKeystrokes > 0
            ? Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100)
            : 100;
        const accuracyElement = document.getElementById('accuracy');
        if (accuracyElement) {
            accuracyElement.textContent = `${accuracy}%`;
        }

        // Update streak
        const streakElement = document.getElementById('streak');
        if (streakElement) {
            streakElement.textContent = this.streak.toString();
        }
    }

    /**
     * Game over
     */
    gameOver() {
        Utils.log.info('Game over - no lives remaining');
        this.restart();
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
            const x = word.x + (this.currentSpeed * interpolation);

            // Draw word text
            if (word.isActive) {
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

                // Show typed text below
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

        // Draw lasers
        this.lasers.forEach(laser => {
            const alpha = laser.life;
            renderer.save();
            renderer.setAlpha(alpha);

            // Draw laser beam
            const gradient = renderer.createGradient(
                laser.x, laser.y,
                laser.x, laser.y - 100,
                [
                    { offset: 0, color: 'transparent' },
                    { offset: 0.5, color: '#00ff00' },
                    { offset: 1, color: '#ffffff' }
                ]
            );

            renderer.ctx.fillStyle = gradient;
            renderer.ctx.fillRect(laser.x - 2, laser.y - 100, 4, 100);

            renderer.restore();
        });

        // Draw explosions
        this.explosions.forEach(explosion => {
            explosion.particles.forEach(particle => {
                renderer.save();
                renderer.setAlpha(particle.life);
                renderer.drawCircle(particle.x, particle.y, 2, {
                    color: renderer.colors.warning,
                    filled: true
                });
                renderer.restore();
            });
        });

        // Draw lives
        for (let i = 0; i < this.lives; i++) {
            renderer.drawText('♥', 20 + i * 20, 20, {
                color: renderer.colors.error,
                size: 'normal'
            });
        }

        // Draw progress to unlock
        if (this.sustainedSeconds > 0) {
            const progress = (this.sustainedSeconds / this.requiredSustainTime) * 100;
            renderer.drawText(`Unlock Progress: ${Math.round(progress)}%`,
                renderer.width / 2, 80, {
                color: renderer.colors.success,
                size: 'small',
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