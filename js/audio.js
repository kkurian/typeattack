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

        // Initialize on first user interaction
        this.setupUserInteraction();
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
     * Initialize Web Audio API context
     */
    init() {
        if (this.initialized) return;

        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();

            // Create master gain node for volume control
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.context.destination);

            this.initialized = true;
            Utils.log.debug('Audio manager initialized');

        } catch (error) {
            Utils.log.error('Failed to initialize Web Audio API:', error);
            this.enabled = false;
        }
    }

    /**
     * Play keystroke sound (short click)
     */
    playKeystroke() {
        if (!this.enabled || !this.initialized) return;

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

        // Play sound
        oscillator.start(time);
        oscillator.stop(time + 0.02);
    }

    /**
     * Play laser shooting sound
     */
    playLaser() {
        if (!this.enabled || !this.initialized) return;

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
            this.context.close();
            this.context = null;
        }
        this.initialized = false;
    }
}

// Export for use in other modules
window.AudioManager = new AudioManager();