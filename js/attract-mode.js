/**
 * TypeAttack - Attract Mode
 * Animated demo that plays on the start screen
 */

class AttractMode {
    constructor(canvasId = 'game-canvas') {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;

        // Demo state
        this.isRunning = false;
        this.words = [];
        this.lasers = [];
        this.explosions = [];
        this.particles = [];

        // Timing
        this.lastTime = 0;
        this.spawnTimer = 0;
        this.typeTimer = 0;
        this.currentWordIndex = 0;
        this.currentLetterIndex = 0;

        // Demo words - 5th grade level vocabulary
        // Pull from the same word corpus used in the game
        this.demoWords = [
            // Easy 5th grade words
            'about', 'after', 'again', 'around', 'because', 'before',
            'between', 'children', 'different', 'during', 'enough', 'example',
            'family', 'follow', 'important', 'kitchen', 'letter', 'listen',
            'making', 'mother', 'nothing', 'number', 'other', 'paper',
            'people', 'person', 'picture', 'place', 'problem', 'question',
            'really', 'school', 'second', 'sentence', 'several', 'should',
            'simple', 'special', 'started', 'story', 'student', 'talking',
            'teacher', 'things', 'think', 'through', 'together', 'turned',
            'usually', 'walking', 'wanted', 'water', 'where', 'which',
            'winter', 'without', 'wonder', 'working', 'writing', 'yellow'
        ];

        // Track which lane was last used to prevent overlap
        this.laneTimes = {};

        this.setupCanvas();
    }

    setupCanvas() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        // Use window dimensions for full screen effect
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Set actual canvas size
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Also update canvas CSS size
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastTime = performance.now();

        // Spawn initial words immediately
        this.spawnDemoWord();
        setTimeout(() => this.spawnDemoWord(), 1000);
        setTimeout(() => this.spawnDemoWord(), 2000);

        this.animate();
    }

    stop() {
        this.isRunning = false;
    }

    animate() {
        if (!this.isRunning) return;

        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(() => this.animate());
    }

    update(deltaTime) {
        // Update word positions
        this.words.forEach(word => {
            word.x += word.speed * deltaTime;

            // Remove words that go off screen (accounting for word width)
            if (word.x > this.width + word.width) {
                word.toRemove = true;
            }
        });

        // Remove marked words
        this.words = this.words.filter(word => !word.toRemove);

        // Spawn new words periodically (faster for hard mode effect)
        this.spawnTimer += deltaTime;
        if (this.spawnTimer > 1.2 && this.words.length < 6) { // More words, faster spawning
            this.spawnDemoWord();
            this.spawnTimer = 0;
        }

        // Simulate typing (very fast for expert mode feel)
        this.typeTimer += deltaTime;
        if (this.typeTimer > 0.08) { // Type a letter every 80ms (expert speed)
            this.simulateTyping();
            this.typeTimer = 0;
        }

        // Update lasers
        this.lasers.forEach(laser => {
            // Update target position to follow the moving word
            if (laser.word && !laser.hasHit) {
                laser.targetX = laser.word.x + (laser.letterIndex * laser.charWidth) + (laser.charWidth / 2);
            }

            laser.progress += laser.speed * deltaTime;
            if (laser.progress >= 1 && !laser.hasHit) {
                laser.hasHit = true;
                this.createExplosion(laser.targetX, laser.targetY);

                // Mark word for removal
                if (laser.targetWord) {
                    laser.targetWord.toRemove = true;
                }
            }
        });

        // Remove completed lasers
        this.lasers = this.lasers.filter(laser => laser.progress < 1.2);

        // Update explosions
        this.explosions.forEach(explosion => {
            explosion.life -= deltaTime * 2;
            explosion.particles.forEach(particle => {
                particle.x += particle.vx * deltaTime;
                particle.y += particle.vy * deltaTime;
                particle.vy += 300 * deltaTime; // Gravity
                particle.life = explosion.life;
            });
        });

        // Remove dead explosions
        this.explosions = this.explosions.filter(exp => exp.life > 0);

        // Update background particles
        this.updateBackgroundParticles(deltaTime);
    }

    spawnDemoWord() {
        const text = this.demoWords[Math.floor(Math.random() * this.demoWords.length)];
        const lanes = [0.25, 0.35, 0.45, 0.55, 0.65, 0.75]; // More lanes for variety

        // Find an available lane (no word spawned there in last 2 seconds)
        const now = Date.now();
        let availableLanes = lanes.filter(lane => {
            const lastTime = this.laneTimes[lane] || 0;
            // Check if any existing word is currently in this lane and too close
            const hasNearbyWord = this.words.some(word => {
                const sameLane = Math.abs(word.y - this.height * lane) < 10;
                const tooClose = word.x < 300; // Ensure good spacing
                return sameLane && tooClose;
            });
            return (now - lastTime > 2000) && !hasNearbyWord;
        });

        // If no lanes available, use any lane but enforce minimum distance
        if (availableLanes.length === 0) {
            availableLanes = lanes;
        }

        const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
        this.laneTimes[lane] = now;

        // Measure text width for accurate laser targeting
        this.ctx.font = '24px Courier New';
        const upperText = text.toUpperCase();
        const textWidth = this.ctx.measureText(upperText).width;

        this.words.push({
            text: text,
            typedIndex: 0,
            x: -textWidth - 50, // Start off-screen based on actual word width
            y: this.height * lane,
            width: textWidth, // Store actual width for laser targeting
            speed: 60 + Math.random() * 40,  // Much faster for "hard mode" feel
            isActive: false,
            color: '#00ff00'
        });
    }

    simulateTyping() {
        // Find the rightmost word that's moved far enough onto screen
        let activeWord = null;
        let maxX = -Infinity;

        this.words.forEach(word => {
            // Only target words that are at least 30% across the screen
            if (word.x > this.width * 0.3 && word.x > maxX && word.typedIndex < word.text.length) {
                maxX = word.x;
                activeWord = word;
            }
        });

        if (activeWord) {
            activeWord.typedIndex++;
            activeWord.isActive = true;

            // If word is complete, fire lasers
            if (activeWord.typedIndex >= activeWord.text.length) {
                this.fireMultiLasers(activeWord);

                // Reset for next word
                this.words.forEach(w => w.isActive = false);
            }
        }
    }

    fireMultiLasers(word) {
        // For monospace font, calculate character width more precisely
        this.ctx.font = '24px Courier New';
        const singleCharWidth = this.ctx.measureText('M').width; // Measure a single character

        for (let i = 0; i < word.text.length; i++) {
            setTimeout(() => {
                // Calculate where the word will be NOW (after the stagger delay)
                const currentX = word.x;
                // Calculate exact center of each letter at its CURRENT position
                const letterX = currentX + (i * singleCharWidth) + (singleCharWidth / 2);

                this.lasers.push({
                    startX: letterX,
                    startY: this.height,
                    targetX: letterX,
                    targetY: word.y,
                    targetWord: i === word.text.length - 1 ? word : null,
                    word: word, // Track the word so we can update target position
                    letterIndex: i, // Track which letter this laser is for
                    progress: 0,
                    speed: 4, // Faster lasers for more excitement
                    hasHit: false,
                    charWidth: singleCharWidth
                });
            }, i * 20); // Faster staggering for rapid-fire effect
        }
    }

    createExplosion(x, y) {
        const particles = [];
        for (let i = 0; i < 15; i++) { // More particles for bigger explosions
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 250, // Increased velocity
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

    updateBackgroundParticles(deltaTime) {
        // Spawn new particles more frequently for a livelier effect
        if (Math.random() < 0.05) { // Increased from 0.02
            this.particles.push({
                x: Math.random() * this.width,
                y: this.height + 10,
                vy: -50 - Math.random() * 150, // Increased speed variance
                life: 1
            });
        }

        // Update particles
        this.particles.forEach(particle => {
            particle.y += particle.vy * deltaTime;
            particle.life -= deltaTime * 0.3;
        });

        // Remove dead particles
        this.particles = this.particles.filter(p => p.life > 0 && p.y > -10);
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Set overall brightness for attract mode
        this.ctx.save();
        this.ctx.globalAlpha = 0.85; // Make everything 85% opacity for brighter visibility

        // Draw background particles
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life * 0.5; // Increased from 0.3 for more visibility
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(particle.x, particle.y, 3, 3); // Slightly bigger particles
            this.ctx.restore();
        });

        // Draw words
        this.ctx.font = '24px Courier New';
        this.ctx.textBaseline = 'middle'; // Align to middle for better laser targeting
        this.words.forEach(word => {
            // Draw full word
            if (word.isActive) {
                this.ctx.fillStyle = '#ffff00';
            } else {
                this.ctx.fillStyle = '#00ff00';
            }
            this.ctx.fillText(word.text.toUpperCase(), word.x, word.y);

            // Draw typed portion in brighter color
            if (word.typedIndex > 0) {
                const typed = word.text.substring(0, word.typedIndex).toUpperCase();
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillText(typed, word.x, word.y);
            }
        });

        // Draw lasers
        this.lasers.forEach(laser => {
            if (laser.progress <= 1) {
                const currentY = laser.startY - (laser.startY - laser.targetY) * laser.progress;
                const alpha = 1 - (laser.progress * 0.3);

                this.ctx.save();
                this.ctx.globalAlpha = alpha;

                // Create gradient
                const gradient = this.ctx.createLinearGradient(
                    laser.targetX, laser.startY,
                    laser.targetX, currentY
                );
                gradient.addColorStop(0, '#00ff00');
                gradient.addColorStop(0.5, '#ffffff');
                gradient.addColorStop(1, '#00ff00');

                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(laser.targetX - 2, currentY, 4, laser.startY - currentY);

                this.ctx.restore();
            }
        });

        // Draw explosions
        this.explosions.forEach(explosion => {
            explosion.particles.forEach(particle => {
                this.ctx.save();
                this.ctx.globalAlpha = particle.life;
                // Use a brighter color mix for explosions
                const colors = ['#ffff00', '#ff6600', '#ffffff', '#00ffff'];
                this.ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2); // Slightly bigger particles
                this.ctx.fill();
                this.ctx.restore();
            });
        });

        // Draw subtle demo text overlay (removed - no longer needed)

        // Restore original alpha
        this.ctx.restore();
    }
}

// Export for use
window.AttractMode = AttractMode;