/**
 * TypeAttack - Audio Manager
 * Procedural sound generation using Web Audio API
 */

class AudioManager {
    constructor() {
        this.context = null;
        this.enabled = true;
        this.volume = 0.5;
        this.initialized = false;

        // Sound presets
        this.sounds = {
            keystroke: null,
            laser: null,
            error: null,
            success: null,
            levelComplete: null
        };

        // User interaction flag for autoplay policy
        this.userInteracted = false;

        // Track active oscillators to prevent overload
        this.activeOscillators = 0;
        this.maxOscillators = 10; // Limit concurrent sounds

        // Initialize on first user interaction
        this.setupUserInteraction();

        // Handle visibility changes (for sleep/wake recovery)
        this.setupVisibilityHandler();
    }

    /**
     * Setup user interaction listener for autoplay policy
     */
    setupUserInteraction() {
        const initAudio = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                this.init();
                // Remove listeners after first interaction
                document.removeEventListener('click', initAudio);
                document.removeEventListener('keydown', initAudio);
            }
        };

        document.addEventListener('click', initAudio);
        document.addEventListener('keydown', initAudio);
    }

    /**
     * Setup visibility handler for sleep/wake recovery
     */
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden && this.context) {
                // Page became visible (e.g., after computer wake)
                console.log('Page visible, audio context state:', this.context.state);

                if (this.context.state === 'interrupted' || this.context.state === 'suspended') {
                    try {
                        // Try to resume the context
                        await this.context.resume();
                        console.log('Audio context resumed, new state:', this.context.state);

                        // If still not running, try to reinitialize
                        if (this.context.state !== 'running') {
                            console.log('Audio context still not running, reinitializing...');
                            this.destroy();
                            this.initialized = false;
                            this.init();
                        }
                    } catch (error) {
                        console.error('Failed to recover audio context:', error);
                        // Try complete reinit as last resort
                        this.destroy();
                        this.initialized = false;
                        this.init();
                    }
                }
            }
        });

        // Also handle page focus events
        window.addEventListener('focus', async () => {
            if (this.context && this.context.state === 'suspended') {
                try {
                    await this.context.resume();
                    console.log('Audio context resumed on focus');
                } catch (error) {
                    console.error('Failed to resume audio on focus:', error);
                }
            }
        });
    }

    /**
     * Initialize Web Audio API context
     */
    init() {
        if (this.initialized) return;

        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();

            // Resume context immediately if suspended (for deployed version)
            if (this.context.state === 'suspended') {
                this.context.resume();
            }

            // Create master gain node for volume control
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.context.destination);

            this.initialized = true;

        } catch (error) {
            console.error('Failed to initialize Web Audio API:', error);
            this.enabled = false;
        }
    }

    /**
     * Play keystroke sound (short click)
     */
    playKeystroke() {
        if (!this.enabled || !this.initialized) return;

        // Prevent too many concurrent sounds
        if (this.activeOscillators >= this.maxOscillators) return;

        const time = this.context.currentTime;

        // Create oscillator for click sound
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        // Configure click sound
        oscillator.frequency.setValueAtTime(800, time);
        oscillator.frequency.exponentialRampToValueAtTime(400, time + 0.01);

        gainNode.gain.setValueAtTime(0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.02);

        // Track oscillator count
        this.activeOscillators++;
        oscillator.onended = () => {
            this.activeOscillators--;
        };

        // Play sound
        oscillator.start(time);
        oscillator.stop(time + 0.02);
    }

    /**
     * Play laser shooting sound
     */
    playLaser() {
        if (!this.enabled || !this.initialized) return;

        // Prevent too many concurrent sounds
        if (this.activeOscillators >= this.maxOscillators) return;

        const time = this.context.currentTime;

        // Create oscillator for laser sound
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        // Configure laser sound (descending sweep)
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(2000, time);
        oscillator.frequency.exponentialRampToValueAtTime(100, time + 0.2);

        // Filter for more "laser-like" sound
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, time);
        filter.frequency.exponentialRampToValueAtTime(500, time + 0.2);
        filter.Q.value = 5;

        // Volume envelope
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.5, time + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        // Track oscillator count
        this.activeOscillators++;
        oscillator.onended = () => {
            this.activeOscillators--;
        };

        // Play sound
        oscillator.start(time);
        oscillator.stop(time + 0.2);
    }

    /**
     * Play error sound (low buzz)
     */
    playError() {
        if (!this.enabled || !this.initialized) return;

        const time = this.context.currentTime;

        // Create oscillator for error sound
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        // Configure error sound (low frequency buzz)
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(100, time);
        oscillator.frequency.setValueAtTime(90, time + 0.05);
        oscillator.frequency.setValueAtTime(100, time + 0.1);

        gainNode.gain.setValueAtTime(0.2, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        // Play sound
        oscillator.start(time);
        oscillator.stop(time + 0.15);
    }

    /**
     * Play success sound (ascending tones)
     */
    playSuccess() {
        if (!this.enabled || !this.initialized) return;

        const time = this.context.currentTime;

        // Play three ascending notes
        const frequencies = [523.25, 659.25, 783.99]; // C, E, G
        const duration = 0.1;

        frequencies.forEach((freq, index) => {
            const startTime = time + (index * duration);

            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);

            oscillator.frequency.setValueAtTime(freq, startTime);
            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
    }

    /**
     * Play level complete sound (fanfare)
     */
    playLevelComplete() {
        if (!this.enabled || !this.initialized) return;

        const time = this.context.currentTime;

        // Play a simple fanfare
        const notes = [
            { freq: 523.25, start: 0, duration: 0.2 },     // C
            { freq: 659.25, start: 0.15, duration: 0.2 },  // E
            { freq: 783.99, start: 0.3, duration: 0.2 },   // G
            { freq: 1046.5, start: 0.45, duration: 0.4 }   // C (octave)
        ];

        notes.forEach(note => {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            const filter = this.context.createBiquadFilter();

            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);

            // Configure sound
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(note.freq, time + note.start);

            // Add slight vibrato
            const vibrato = this.context.createOscillator();
            const vibratoGain = this.context.createGain();
            vibrato.frequency.value = 5;
            vibratoGain.gain.value = 10;
            vibrato.connect(vibratoGain);
            vibratoGain.connect(oscillator.frequency);
            vibrato.start(time + note.start);
            vibrato.stop(time + note.start + note.duration);

            // Filter for warmth
            filter.type = 'lowpass';
            filter.frequency.value = 2000;
            filter.Q.value = 1;

            // Volume envelope
            gainNode.gain.setValueAtTime(0, time + note.start);
            gainNode.gain.linearRampToValueAtTime(0.4, time + note.start + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + note.start + note.duration);

            // Play sound
            oscillator.start(time + note.start);
            oscillator.stop(time + note.start + note.duration);
        });
    }

    /**
     * Play special introductory fanfare for game start
     */
    playIntroFanfare() {
        if (!this.enabled || !this.initialized) return;

        const time = this.context.currentTime;

        // Play a much longer, more elaborate fanfare for game introduction
        const notes = [
            // Opening flourish (ascending arpeggio)
            { freq: 130.81, start: 0, duration: 0.2 },       // C3
            { freq: 164.81, start: 0.15, duration: 0.2 },    // E3
            { freq: 196, start: 0.3, duration: 0.2 },        // G3
            { freq: 261.63, start: 0.45, duration: 0.25 },   // C4

            // First phrase
            { freq: 261.63, start: 0.8, duration: 0.3 },     // C4
            { freq: 329.63, start: 1.05, duration: 0.25 },   // E4
            { freq: 392, start: 1.25, duration: 0.25 },      // G4
            { freq: 523.25, start: 1.45, duration: 0.3 },    // C5

            // Second phrase (response)
            { freq: 440, start: 1.9, duration: 0.25 },       // A4
            { freq: 392, start: 2.1, duration: 0.25 },       // G4
            { freq: 349.23, start: 2.3, duration: 0.25 },    // F4
            { freq: 329.63, start: 2.5, duration: 0.3 },     // E4

            // Bridge
            { freq: 293.66, start: 2.9, duration: 0.2 },     // D4
            { freq: 329.63, start: 3.05, duration: 0.2 },    // E4
            { freq: 349.23, start: 3.2, duration: 0.2 },     // F4
            { freq: 392, start: 3.35, duration: 0.25 },      // G4

            // Grand finale
            { freq: 523.25, start: 3.7, duration: 0.2 },     // C5
            { freq: 659.25, start: 3.85, duration: 0.2 },    // E5
            { freq: 783.99, start: 4.0, duration: 0.25 },    // G5
            { freq: 1046.5, start: 4.2, duration: 0.6 },     // C6 (held)
        ];

        notes.forEach(note => {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            const filter = this.context.createBiquadFilter();

            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);

            // Configure sound - mix of sine and triangle for richness
            oscillator.type = note.start < 0.6 ? 'sine' : 'triangle';
            oscillator.frequency.setValueAtTime(note.freq, time + note.start);

            // Add slight vibrato for warmth on longer notes
            if (note.duration > 0.2) {
                const vibrato = this.context.createOscillator();
                const vibratoGain = this.context.createGain();
                vibrato.frequency.value = 4;
                vibratoGain.gain.value = 5;
                vibrato.connect(vibratoGain);
                vibratoGain.connect(oscillator.frequency);
                vibrato.start(time + note.start);
                vibrato.stop(time + note.start + note.duration);
            }

            // Filter for warmth
            filter.type = 'lowpass';
            filter.frequency.value = 3500;
            filter.Q.value = 2;

            // Volume envelope - louder for intro
            gainNode.gain.setValueAtTime(0, time + note.start);
            gainNode.gain.linearRampToValueAtTime(0.6, time + note.start + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + note.start + note.duration);

            // Play sound
            oscillator.start(time + note.start);
            oscillator.stop(time + note.start + note.duration);
        });

        // Add a bass note for depth (extended for longer fanfare)
        const bass = this.context.createOscillator();
        const bassGain = this.context.createGain();
        bass.connect(bassGain);
        bassGain.connect(this.masterGain);

        bass.type = 'sine';
        bass.frequency.setValueAtTime(65.41, time); // C2 (lower octave)
        bassGain.gain.setValueAtTime(0, time);
        bassGain.gain.linearRampToValueAtTime(0.25, time + 0.2);
        bassGain.gain.setValueAtTime(0.25, time + 3.5);
        bassGain.gain.linearRampToValueAtTime(0.35, time + 4.0); // Swell for finale
        bassGain.gain.exponentialRampToValueAtTime(0.01, time + 4.8);

        bass.start(time);
        bass.stop(time + 4.8);

        // Add a harmony line for richness
        const harmony = this.context.createOscillator();
        const harmonyGain = this.context.createGain();
        harmony.connect(harmonyGain);
        harmonyGain.connect(this.masterGain);

        harmony.type = 'triangle';
        harmony.frequency.setValueAtTime(196, time + 1.9); // G3
        harmony.frequency.setValueAtTime(174.61, time + 2.5); // F3
        harmony.frequency.setValueAtTime(196, time + 3.7); // G3

        harmonyGain.gain.setValueAtTime(0, time + 1.9);
        harmonyGain.gain.linearRampToValueAtTime(0.2, time + 2.0);
        harmonyGain.gain.setValueAtTime(0.2, time + 4.0);
        harmonyGain.gain.exponentialRampToValueAtTime(0.01, time + 4.5);

        harmony.start(time + 1.9);
        harmony.stop(time + 4.5);
    }

    /**
     * Play stage advancement fanfare
     */
    playStageAdvance() {
        if (!this.enabled || !this.initialized) return;

        const time = this.context.currentTime;

        // Play a short ascending fanfare
        const notes = [
            { freq: 440, start: 0, duration: 0.15 },      // A
            { freq: 554.37, start: 0.1, duration: 0.15 }, // C#
            { freq: 659.25, start: 0.2, duration: 0.2 },  // E
            { freq: 880, start: 0.35, duration: 0.25 }    // A (octave)
        ];

        notes.forEach(note => {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            const filter = this.context.createBiquadFilter();

            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);

            // Configure sound
            oscillator.type = 'triangle'; // Softer than sine
            oscillator.frequency.setValueAtTime(note.freq, time + note.start);

            // Filter for warmth
            filter.type = 'lowpass';
            filter.frequency.value = 3000;
            filter.Q.value = 2;

            // Volume envelope
            gainNode.gain.setValueAtTime(0, time + note.start);
            gainNode.gain.linearRampToValueAtTime(0.5, time + note.start + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + note.start + note.duration);

            // Play sound
            oscillator.start(time + note.start);
            oscillator.stop(time + note.start + note.duration);
        });
    }

    /**
     * Play looping high score fanfare
     * Creates an upbeat, retro arcade-style loop
     * @returns {Function} Stop function to end the loop
     */
    playHighScoreFanfare() {
        if (!this.enabled || !this.initialized) return () => {};

        let isPlaying = true;
        const activeOscillators = new Set();
        const loopDuration = 4.0; // 4 second loop for more musical content

        // Create a looping pattern
        const createLoop = (startTime) => {
            if (!isPlaying) return;

            // Extended pattern: upbeat arcade-style melody (4 bars at 120 BPM)
            const notes = [
                // Bar 1 - Main theme
                { freq: 523.25, start: 0.0, duration: 0.2 },     // C5
                { freq: 659.25, start: 0.25, duration: 0.2 },    // E5
                { freq: 783.99, start: 0.5, duration: 0.2 },     // G5
                { freq: 659.25, start: 0.75, duration: 0.2 },    // E5

                // Bar 2 - Variation
                { freq: 698.46, start: 1.0, duration: 0.2 },     // F5
                { freq: 880.00, start: 1.25, duration: 0.2 },    // A5
                { freq: 783.99, start: 1.5, duration: 0.2 },     // G5
                { freq: 659.25, start: 1.75, duration: 0.2 },    // E5

                // Bar 3 - Response
                { freq: 587.33, start: 2.0, duration: 0.2 },     // D5
                { freq: 659.25, start: 2.25, duration: 0.2 },    // E5
                { freq: 698.46, start: 2.5, duration: 0.2 },     // F5
                { freq: 587.33, start: 2.75, duration: 0.2 },    // D5

                // Bar 4 - Resolution (leads back to C)
                { freq: 659.25, start: 3.0, duration: 0.2 },     // E5
                { freq: 587.33, start: 3.25, duration: 0.2 },    // D5
                { freq: 523.25, start: 3.5, duration: 0.15 },    // C5
                { freq: 523.25, start: 3.75, duration: 0.15 },   // C5 (repeat for emphasis)

                // Add some decoration notes
                { freq: 392.00, start: 0.12, duration: 0.1 },    // G4 (grace note)
                { freq: 440.00, start: 1.12, duration: 0.1 },    // A4 (grace note)
                { freq: 392.00, start: 2.12, duration: 0.1 },    // G4 (grace note)
                { freq: 440.00, start: 3.37, duration: 0.1 },    // A4 (grace note)
            ];

            // Extended bass line pattern with walking bass
            const bassNotes = [
                // Bar 1
                { freq: 130.81, start: 0.0, duration: 0.4 },     // C3
                { freq: 164.81, start: 0.5, duration: 0.4 },     // E3

                // Bar 2
                { freq: 174.61, start: 1.0, duration: 0.4 },     // F3
                { freq: 196.00, start: 1.5, duration: 0.4 },     // G3

                // Bar 3
                { freq: 196.00, start: 2.0, duration: 0.4 },     // G3
                { freq: 174.61, start: 2.5, duration: 0.4 },     // F3

                // Bar 4
                { freq: 164.81, start: 3.0, duration: 0.4 },     // E3
                { freq: 130.81, start: 3.5, duration: 0.4 },     // C3 (resolves back)
            ];

            // Add a middle harmony voice for richness
            const harmonyNotes = [
                // Bar 1
                { freq: 329.63, start: 0.0, duration: 0.4 },     // E4
                { freq: 392.00, start: 0.5, duration: 0.4 },     // G4

                // Bar 2
                { freq: 440.00, start: 1.0, duration: 0.4 },     // A4
                { freq: 392.00, start: 1.5, duration: 0.4 },     // G4

                // Bar 3
                { freq: 349.23, start: 2.0, duration: 0.4 },     // F4
                { freq: 329.63, start: 2.5, duration: 0.4 },     // E4

                // Bar 4
                { freq: 293.66, start: 3.0, duration: 0.4 },     // D4
                { freq: 261.63, start: 3.5, duration: 0.4 },     // C4
            ];

            // Create melody
            notes.forEach(note => {
                if (!isPlaying) return;

                const oscillator = this.context.createOscillator();
                const gainNode = this.context.createGain();
                const filter = this.context.createBiquadFilter();

                oscillator.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.masterGain);

                oscillator.type = 'square'; // Retro game sound
                oscillator.frequency.setValueAtTime(note.freq, startTime + note.start);

                // Filter for less harsh square wave
                filter.type = 'lowpass';
                filter.frequency.value = 2500;
                filter.Q.value = 0.5;

                // Smooth volume envelope to avoid clicks
                const attackTime = 0.005;
                const releaseTime = 0.01;
                gainNode.gain.setValueAtTime(0, startTime + note.start);
                gainNode.gain.linearRampToValueAtTime(0.15, startTime + note.start + attackTime);
                gainNode.gain.setValueAtTime(0.15, startTime + note.start + note.duration - releaseTime);
                gainNode.gain.linearRampToValueAtTime(0, startTime + note.start + note.duration);

                oscillator.start(startTime + note.start);
                oscillator.stop(startTime + note.start + note.duration);

                activeOscillators.add(oscillator);
                oscillator.onended = () => activeOscillators.delete(oscillator);
            });

            // Create bass line
            bassNotes.forEach(note => {
                if (!isPlaying) return;

                const oscillator = this.context.createOscillator();
                const gainNode = this.context.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.masterGain);

                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(note.freq, startTime + note.start);

                // Smooth volume envelope
                const attackTime = 0.01;
                const releaseTime = 0.02;
                gainNode.gain.setValueAtTime(0, startTime + note.start);
                gainNode.gain.linearRampToValueAtTime(0.12, startTime + note.start + attackTime);
                gainNode.gain.setValueAtTime(0.12, startTime + note.start + note.duration - releaseTime);
                gainNode.gain.linearRampToValueAtTime(0, startTime + note.start + note.duration);

                oscillator.start(startTime + note.start);
                oscillator.stop(startTime + note.start + note.duration);

                activeOscillators.add(oscillator);
                oscillator.onended = () => activeOscillators.delete(oscillator);
            });

            // Create harmony line
            harmonyNotes.forEach(note => {
                if (!isPlaying) return;

                const oscillator = this.context.createOscillator();
                const gainNode = this.context.createGain();
                const filter = this.context.createBiquadFilter();

                oscillator.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.masterGain);

                oscillator.type = 'triangle'; // Softer than square
                oscillator.frequency.setValueAtTime(note.freq, startTime + note.start);

                // Gentle filter
                filter.type = 'lowpass';
                filter.frequency.value = 3000;

                // Smooth volume envelope (quieter than melody)
                const attackTime = 0.01;
                const releaseTime = 0.02;
                gainNode.gain.setValueAtTime(0, startTime + note.start);
                gainNode.gain.linearRampToValueAtTime(0.08, startTime + note.start + attackTime);
                gainNode.gain.setValueAtTime(0.08, startTime + note.start + note.duration - releaseTime);
                gainNode.gain.linearRampToValueAtTime(0, startTime + note.start + note.duration);

                oscillator.start(startTime + note.start);
                oscillator.stop(startTime + note.start + note.duration);

                activeOscillators.add(oscillator);
                oscillator.onended = () => activeOscillators.delete(oscillator);
            });

            // Schedule next loop - use Web Audio scheduling for perfect timing
            if (isPlaying) {
                // Schedule next loop to start exactly when this one ends
                const nextLoopTime = startTime + loopDuration;
                const timeUntilNextLoop = (nextLoopTime - this.context.currentTime) * 1000;

                if (timeUntilNextLoop > 0) {
                    setTimeout(() => {
                        if (isPlaying) {
                            createLoop(nextLoopTime);
                        }
                    }, Math.max(0, timeUntilNextLoop - 10)); // Start scheduling 10ms early
                }
            }
        };

        // Start the first loop immediately
        createLoop(this.context.currentTime);

        // Return stop function
        return () => {
            isPlaying = false;
            // Stop any still-playing oscillators
            activeOscillators.forEach(osc => {
                try {
                    osc.stop();
                } catch(e) {
                    // Oscillator might have already stopped
                }
            });
            activeOscillators.clear();
        };
    }

    /**
     * Play explosion sound (for word destruction)
     */
    playExplosion() {
        if (!this.enabled || !this.initialized) return;

        const time = this.context.currentTime;

        // White noise for explosion
        const bufferSize = this.context.sampleRate * 0.2; // 200ms
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        // Fill buffer with white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        // Create nodes
        const source = this.context.createBufferSource();
        const filter = this.context.createBiquadFilter();
        const gainNode = this.context.createGain();

        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        // Configure filter (sweep down for explosion effect)
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(5000, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);
        filter.Q.value = 2;

        // Volume envelope
        gainNode.gain.setValueAtTime(0.4, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        // Play sound
        source.start(time);
        source.stop(time + 0.2);
    }

    /**
     * Set master volume
     * @param {number} volume - Volume level (0-1)
     */
    setVolume(volume) {
        this.volume = Utils.clamp(volume, 0, 1);
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
        Utils.log.debug(`Volume set to ${Math.round(this.volume * 100)}%`);
    }

    /**
     * Get current volume
     * @returns {number} Current volume (0-1)
     */
    getVolume() {
        return this.volume;
    }

    /**
     * Enable or disable sound
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        Utils.log.debug(`Sound ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if sound is enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Resume audio context (for autoplay policy)
     */
    async resume() {
        if (this.context && this.context.state === 'suspended') {
            try {
                await this.context.resume();
                Utils.log.debug('Audio context resumed');
            } catch (error) {
                Utils.log.error('Failed to resume audio context:', error);
            }
        }
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        if (this.context) {
            try {
                this.context.close();
            } catch (error) {
                console.error('Error closing audio context:', error);
            }
            this.context = null;
            this.masterGain = null;
        }
        this.activeOscillators = 0;
        this.initialized = false;
    }
}

// Export for use in other modules
window.AudioManager = new AudioManager();