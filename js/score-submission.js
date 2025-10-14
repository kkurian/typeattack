/**
 * Score Submission Module
 * Handles UI and logic for submitting high scores to the leaderboard
 * Integrates with user identity, session recording, and hash calculation
 */

class ScoreSubmission {
  constructor() {
    this.apiUrl = 'https://typeattack-leaderboard.kerry-f2f.workers.dev/api/submit-score';
    this.isSubmitting = false;
    this.sessionData = null;
  }

  /**
   * Initialize the score submission system
   */
  init() {
    // Create submission UI elements if they don't exist
    this.createSubmissionUI();

    // Load any existing user identity
    if (typeof userIdentity !== 'undefined') {
      const identity = userIdentity.getIdentity();
      if (identity && identity.initials) {
        const initialsInput = document.getElementById('score-initials-input');
        if (initialsInput) {
          initialsInput.value = identity.initials;
        }
      }
    }
  }

  /**
   * Create the score submission UI elements
   */
  createSubmissionUI() {
    // Check if UI already exists
    if (document.getElementById('score-submission-modal')) {
      return;
    }

    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'score-submission-modal';
    modal.className = 'score-submission-modal hidden';
    modal.innerHTML = `
      <div class="score-submission-content">
        <h2>Submit Your Score!</h2>
        <div class="score-summary">
          <p>Your Performance:</p>
          <div class="score-stats">
            <span id="submission-wpm">0 WPM</span>
            <span id="submission-accuracy">0% Accuracy</span>
            <span id="submission-stage">Stage 0</span>
          </div>
        </div>
        <div class="initials-section">
          <label for="score-initials-input">Enter Your Initials:</label>
          <input
            type="text"
            id="score-initials-input"
            maxlength="3"
            pattern="[A-Z]{3}"
            placeholder="AAA"
            title="3 uppercase letters"
          />
          <div class="initials-error hidden" id="initials-error">
            Initials must be exactly 3 uppercase letters
          </div>
        </div>
        <div class="submission-actions">
          <button id="submit-score-btn" class="submit-btn">Submit Score</button>
          <button id="skip-submission-btn" class="skip-btn">Skip</button>
        </div>
        <div class="submission-status hidden" id="submission-status"></div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    this.attachEventListeners();

    // Add CSS if not already present
    this.injectStyles();
  }

  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners() {
    // Initials input - auto uppercase and validation
    const initialsInput = document.getElementById('score-initials-input');
    if (initialsInput) {
      initialsInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
        this.clearError();
      });

      initialsInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.submitScore();
        }
      });
    }

    // Submit button
    const submitBtn = document.getElementById('submit-score-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitScore());
    }

    // Skip button
    const skipBtn = document.getElementById('skip-submission-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.hideModal());
    }

    // Click outside modal to close
    const modal = document.getElementById('score-submission-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideModal();
        }
      });
    }
  }

  /**
   * Show the submission modal with game stats
   * @param {Object} sessionData - Session data from the game
   */
  async showSubmissionModal(sessionData) {
    if (!sessionData) {
      console.error('No session data provided for submission');
      return;
    }

    this.sessionData = sessionData;
    const modal = document.getElementById('score-submission-modal');

    if (!modal) {
      this.createSubmissionUI();
    }

    // Update stats display
    const stats = sessionData.stats || {};
    document.getElementById('submission-wpm').textContent = `${stats.wpm || 0} WPM`;
    document.getElementById('submission-accuracy').textContent = `${stats.accuracy || 0}% Accuracy`;
    document.getElementById('submission-stage').textContent = `Stage ${sessionData.stage || 0}`;

    // Load existing initials if user has identity
    if (typeof userIdentity !== 'undefined') {
      const identity = userIdentity.getIdentity();
      if (identity && identity.initials) {
        document.getElementById('score-initials-input').value = identity.initials;
      }
    }

    // Show modal
    document.getElementById('score-submission-modal').classList.remove('hidden');
    document.getElementById('score-initials-input').focus();
  }

  /**
   * Hide the submission modal
   */
  hideModal() {
    const modal = document.getElementById('score-submission-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    this.clearStatus();
    this.clearError();
  }

  /**
   * Validate initials format
   * @param {string} initials - Initials to validate
   * @returns {boolean} True if valid
   */
  validateInitials(initials) {
    return /^[A-Z]{3}$/.test(initials);
  }

  /**
   * Submit the score to the API
   */
  async submitScore() {
    if (this.isSubmitting) return;

    const initialsInput = document.getElementById('score-initials-input');
    const initials = initialsInput.value.trim();

    // Validate initials
    if (!this.validateInitials(initials)) {
      this.showError('Initials must be exactly 3 uppercase letters');
      initialsInput.focus();
      return;
    }

    this.isSubmitting = true;
    this.showStatus('Submitting score...');

    try {
      // Create or get user identity
      let identity = null;
      if (typeof userIdentity !== 'undefined') {
        if (!userIdentity.hasIdentity()) {
          identity = userIdentity.createIdentity(initials);
        } else {
          identity = userIdentity.getIdentity();
          // Update initials if changed
          if (identity.initials !== initials) {
            userIdentity.updateInitials(initials);
            identity.initials = initials;
          }
        }
      } else {
        // Fallback if userIdentity module not available
        identity = {
          uuid: this.generateFallbackUUID(),
          initials: initials
        };
      }

      // Calculate session hash
      let calculatedHash = null;
      if (typeof sessionHash !== 'undefined' && sessionHash.calculate) {
        try {
          calculatedHash = await sessionHash.calculate(this.sessionData);
        } catch (error) {
          console.error('Failed to calculate session hash:', error);
          // Don't use fallback for production - require secure hashing
          this.showStatus('✗ Secure hash calculation failed. Please try a modern browser.', 'error');
          this.isSubmitting = false;
          return;
        }
      } else {
        // Session hash module not loaded - this shouldn't happen
        console.error('Session hash module not loaded');
        this.showStatus('✗ System error. Please refresh and try again.', 'error');
        this.isSubmitting = false;
        return;
      }

      // Prepare submission data
      const submission = {
        userId: identity.uuid,
        initials: initials,
        sessionHash: calculatedHash,
        sessionData: this.sessionData,
        timestamp: Date.now()
      };

      // Submit to API
      const response = await this.postToAPI(submission);

      if (response.success) {
        this.showStatus('✓ Score submitted successfully!', 'success');

        // Store user ID if returned
        if (response.userId && typeof userIdentity !== 'undefined') {
          // User identity already created/updated above
        }

        // Hide modal after delay
        setTimeout(() => {
          this.hideModal();
          // Trigger leaderboard refresh if available
          if (typeof leaderboard !== 'undefined' && leaderboard.refresh) {
            leaderboard.refresh();
          }
        }, 2000);
      } else {
        const errorMsg = response.error || 'Failed to submit score';
        this.showStatus(`✗ ${errorMsg}`, 'error');

        if (response.retryAfter) {
          this.showStatus(`✗ ${errorMsg} (retry after ${response.retryAfter}s)`, 'error');
        }
      }
    } catch (error) {
      console.error('Score submission error:', error);
      this.showStatus('✗ Network error. Please try again.', 'error');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Post submission data to API
   * @param {Object} data - Submission data
   * @returns {Promise<Object>} API response
   */
  async postToAPI(data) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    return await response.json();
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    const errorDiv = document.getElementById('initials-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  }

  /**
   * Clear error message
   */
  clearError() {
    const errorDiv = document.getElementById('initials-error');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  }

  /**
   * Show status message
   * @param {string} message - Status message
   * @param {string} type - Status type (info, success, error)
   */
  showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('submission-status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `submission-status ${type}`;
      statusDiv.classList.remove('hidden');
    }
  }

  /**
   * Clear status message
   */
  clearStatus() {
    const statusDiv = document.getElementById('submission-status');
    if (statusDiv) {
      statusDiv.classList.add('hidden');
    }
  }

  /**
   * Generate fallback UUID if crypto API not available
   * @returns {string} UUID-like string
   */
  generateFallbackUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }


  /**
   * Inject CSS styles for the submission UI
   */
  injectStyles() {
    if (document.getElementById('score-submission-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'score-submission-styles';
    style.textContent = `
      .score-submission-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }

      .score-submission-modal.hidden {
        display: none;
      }

      .score-submission-content {
        background: #1a1a2e;
        border: 2px solid #16213e;
        border-radius: 10px;
        padding: 30px;
        max-width: 400px;
        width: 90%;
        color: white;
      }

      .score-submission-content h2 {
        margin-top: 0;
        color: #00ff00;
        text-align: center;
      }

      .score-summary {
        margin: 20px 0;
        padding: 15px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 5px;
      }

      .score-stats {
        display: flex;
        justify-content: space-around;
        margin-top: 10px;
        font-size: 1.1em;
      }

      .score-stats span {
        color: #00ffff;
      }

      .initials-section {
        margin: 20px 0;
      }

      .initials-section label {
        display: block;
        margin-bottom: 10px;
      }

      #score-initials-input {
        width: 100%;
        padding: 10px;
        font-size: 1.5em;
        text-align: center;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid #00ff00;
        color: white;
        text-transform: uppercase;
        letter-spacing: 0.2em;
      }

      .initials-error {
        color: #ff4444;
        margin-top: 10px;
        font-size: 0.9em;
      }

      .submission-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      .submit-btn, .skip-btn {
        flex: 1;
        padding: 12px;
        font-size: 1.1em;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background 0.3s;
      }

      .submit-btn {
        background: #00ff00;
        color: black;
      }

      .submit-btn:hover {
        background: #00cc00;
      }

      .skip-btn {
        background: #666;
        color: white;
      }

      .skip-btn:hover {
        background: #555;
      }

      .submission-status {
        margin-top: 15px;
        padding: 10px;
        border-radius: 5px;
        text-align: center;
      }

      .submission-status.info {
        background: rgba(0, 100, 255, 0.2);
        color: #00aaff;
      }

      .submission-status.success {
        background: rgba(0, 255, 0, 0.2);
        color: #00ff00;
      }

      .submission-status.error {
        background: rgba(255, 0, 0, 0.2);
        color: #ff4444;
      }

      .hidden {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
  }
}

// Create and export singleton instance
const scoreSubmission = new ScoreSubmission();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => scoreSubmission.init());
} else {
  scoreSubmission.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = scoreSubmission;
}