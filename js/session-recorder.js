/**
 * Session Recorder
 * Tracks all game events during gameplay for replay and validation
 * Records words, keystrokes, timings, and game state
 */

class SessionRecorder {
  constructor() {
    this.reset();
  }

  /**
   * Reset the recorder for a new session
   */
  reset() {
    this.sessionData = {
      sessionHash: null,      // Will be calculated at end
      version: 1,             // Schema version
      seed: null,             // RNG seed for word generation
      stage: 0,               // Current stage
      duration: 0,            // Total session duration in ms
      startTime: null,        // Session start timestamp
      endTime: null,          // Session end timestamp

      // Words presented during session
      words: [],

      // All keystrokes during session
      keystrokes: [],

      // Calculated stats
      stats: {
        wpm: 0,
        accuracy: 0,
        totalKeystrokes: 0,
        correctKeystrokes: 0,
        wordsCompleted: 0
      }
    };

    this.isRecording = false;
    this.currentWordIndex = -1;
  }

  /**
   * Start recording a new session
   * @param {number} seed - RNG seed for this session
   */
  startSession(seed) {
    this.reset();
    this.sessionData.seed = seed;
    this.sessionData.startTime = Date.now();
    this.isRecording = true;

    console.log('Session recording started with seed:', seed);
  }

  /**
   * End the current session
   */
  endSession() {
    if (!this.isRecording) {
      return null;
    }

    this.sessionData.endTime = Date.now();
    this.sessionData.duration = this.sessionData.endTime - this.sessionData.startTime;
    this.isRecording = false;

    // Calculate final stats
    this.calculateStats();

    console.log('Session recording ended. Duration:', this.sessionData.duration, 'ms');
    return this.sessionData;
  }

  /**
   * Update the current stage
   * @param {number} stage - Current game stage
   */
  updateStage(stage) {
    if (!this.isRecording) return;
    this.sessionData.stage = stage;
  }

  /**
   * Record a new word appearing
   * @param {Object} word - Word object with text, position, etc.
   * @returns {number} Index of the added word
   */
  addWord(word) {
    if (!this.isRecording) return -1;

    const wordData = {
      text: word.text || word.word || '',
      spawnTime: Date.now() - this.sessionData.startTime,
      completedTime: null,
      x: word.x || 0,
      y: word.y || 0
    };

    const index = this.sessionData.words.length;
    this.sessionData.words.push(wordData);
    return index;
  }

  /**
   * Mark a word as completed
   * @param {number} wordIndex - Index of the completed word
   */
  completeWord(wordIndex) {
    if (!this.isRecording) return;
    if (wordIndex < 0 || wordIndex >= this.sessionData.words.length) return;

    this.sessionData.words[wordIndex].completedTime =
      Date.now() - this.sessionData.startTime;
    this.sessionData.stats.wordsCompleted++;
  }

  /**
   * Record a keystroke
   * @param {string} key - The key pressed
   * @param {number} wordIndex - Index of the target word
   * @param {boolean} correct - Whether the keystroke was correct
   */
  recordKeystroke(key, wordIndex, correct) {
    if (!this.isRecording) return;

    const keystroke = {
      key: key,
      timestamp: Date.now() - this.sessionData.startTime,
      wordIndex: wordIndex,
      correct: correct
    };

    this.sessionData.keystrokes.push(keystroke);
    this.sessionData.stats.totalKeystrokes++;

    if (correct) {
      this.sessionData.stats.correctKeystrokes++;
    }
  }

  /**
   * Calculate session statistics
   */
  calculateStats() {
    const stats = this.sessionData.stats;

    // Calculate WPM
    if (this.sessionData.duration > 0) {
      const minutes = this.sessionData.duration / 60000;
      stats.wpm = Math.round((stats.wordsCompleted / minutes) * 10) / 10;
    }

    // Calculate accuracy
    if (stats.totalKeystrokes > 0) {
      stats.accuracy = Math.round((stats.correctKeystrokes / stats.totalKeystrokes) * 1000) / 10;
    }
  }

  /**
   * Get current session data
   * @returns {Object} Current session data
   */
  getSessionData() {
    if (this.isRecording) {
      // Update stats for live preview
      this.calculateStats();
    }
    return { ...this.sessionData };
  }

  /**
   * Check if currently recording
   * @returns {boolean} True if recording
   */
  isSessionActive() {
    return this.isRecording;
  }

  /**
   * Get session summary for display
   * @returns {Object} Summary statistics
   */
  getSessionSummary() {
    return {
      stage: this.sessionData.stage,
      wpm: this.sessionData.stats.wpm,
      accuracy: this.sessionData.stats.accuracy,
      wordsCompleted: this.sessionData.stats.wordsCompleted,
      duration: Math.round(this.sessionData.duration / 1000) // In seconds
    };
  }

  /**
   * Export session data for submission
   * @returns {Object} Session data ready for submission
   */
  async exportForSubmission() {
    if (this.isRecording) {
      console.warn('Session still recording - ending it now');
      this.endSession();
    }

    // Create a copy of session data
    const exportData = JSON.parse(JSON.stringify(this.sessionData));

    // Calculate session hash if sessionHash module is available
    if (typeof sessionHash !== 'undefined' && sessionHash.calculate) {
      try {
        exportData.sessionHash = await sessionHash.calculate(exportData);
      } catch (error) {
        console.error('Failed to calculate session hash:', error);
        // Use fallback hash if available
        if (sessionHash.calculateFallback) {
          exportData.sessionHash = sessionHash.calculateFallback(exportData);
        }
      }
    }

    return exportData;
  }

  /**
   * Load session data (for replay or testing)
   * @param {Object} data - Session data to load
   */
  loadSessionData(data) {
    if (this.isRecording) {
      console.warn('Cannot load data while recording');
      return false;
    }

    this.sessionData = { ...data };
    return true;
  }
}

// Create and export singleton instance
const sessionRecorder = new SessionRecorder();

// Also export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = sessionRecorder;
}