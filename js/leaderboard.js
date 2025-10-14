/**
 * Leaderboard Display Module
 * Fetches and displays the public leaderboard with caching
 * Shows player rankings, scores, and vote counts
 */

class Leaderboard {
  constructor() {
    this.dataUrl = 'data/leaderboard.json'; // Static JSON file served by GitHub Pages
    this.cacheKey = 'typeattack_leaderboard_cache';
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache
    this.leaderboardData = null;
    this.container = null;
    this.autoRefreshInterval = null;
  }

  /**
   * Initialize the leaderboard system
   */
  init(containerId = 'leaderboard-container') {
    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.warn(`Leaderboard container '${containerId}' not found`);
      return;
    }

    // Load and display leaderboard
    this.loadAndDisplay();

    // Set up auto-refresh every 5 minutes
    this.autoRefreshInterval = setInterval(() => {
      this.loadAndDisplay(true); // Force refresh
    }, this.cacheTTL);

    // Add styles
    this.injectStyles();
  }

  /**
   * Load leaderboard data (with caching)
   */
  async loadLeaderboardData(forceRefresh = false) {
    // Check cache first unless forced to refresh
    if (!forceRefresh) {
      const cached = this.getCachedData();
      if (cached) {
        console.log('Using cached leaderboard data');
        return cached;
      }
    }

    try {
      console.log('Fetching fresh leaderboard data...');
      const response = await fetch(this.dataUrl + '?t=' + Date.now()); // Cache bust

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate data structure
      if (!data || !Array.isArray(data.scores)) {
        throw new Error('Invalid leaderboard data format');
      }

      // Cache the data
      this.cacheData(data);

      return data;
    } catch (error) {
      console.error('Failed to load leaderboard:', error);

      // Try to use stale cache if fetch fails
      const staleCache = this.getCachedData(true); // Get even if expired
      if (staleCache) {
        console.log('Using stale cache due to fetch error');
        return staleCache;
      }

      // Return empty structure
      return { version: 1, scores: [], generated: Date.now() };
    }
  }

  /**
   * Get cached data from localStorage
   */
  getCachedData(allowExpired = false) {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);

      // Check if cache is still valid
      if (!allowExpired && Date.now() - timestamp > this.cacheTTL) {
        console.log('Cache expired');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  /**
   * Cache data in localStorage
   */
  cacheData(data) {
    try {
      const cacheEntry = {
        data: data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  /**
   * Load and display the leaderboard
   */
  async loadAndDisplay(forceRefresh = false) {
    if (!this.container) return;

    // Show loading state
    this.showLoading();

    // Load data
    this.leaderboardData = await this.loadLeaderboardData(forceRefresh);

    // Display the leaderboard
    this.display();
  }

  /**
   * Display the leaderboard
   */
  display() {
    if (!this.container || !this.leaderboardData) return;

    const scores = this.leaderboardData.scores || [];

    if (scores.length === 0) {
      this.showEmptyState();
      return;
    }

    // Filter out heavily flagged scores (T032)
    const displayScores = scores.filter(score => {
      const flags = score.votes?.flags || 0;
      return flags < 10; // Hide if 10+ flags
    });

    // Take top 20 by default (T032)
    const topScores = displayScores.slice(0, 20);

    // Build leaderboard HTML
    let html = `
      <div class="leaderboard">
        <div class="leaderboard-header">
          <h2>🏆 Leaderboard</h2>
          <div class="leaderboard-meta">
            <span>Updated: ${this.formatTimestamp(this.leaderboardData.generated)}</span>
          </div>
        </div>
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>WPM</th>
              <th>Accuracy</th>
              <th>Stage</th>
              <th>Votes</th>
              <th>Replay</th>
            </tr>
          </thead>
          <tbody>
    `;

    topScores.forEach(score => {
      const votes = score.votes || { up: 0, flags: 0 };
      const rowClass = this.getRowClass(score);

      html += `
        <tr class="${rowClass}" data-session-hash="${score.sessionHash}">
          <td class="rank">${score.rank}</td>
          <td class="player">${this.escapeHtml(score.initials)}</td>
          <td class="wpm">${score.wpm}</td>
          <td class="accuracy">${score.accuracy}%</td>
          <td class="stage">${score.stage}</td>
          <td class="votes">
            <span class="vote-count thumbs-up" title="Thumbs up">👍 ${votes.up}</span>
            <span class="vote-count flags" title="Flags">🚩 ${votes.flags}</span>
          </td>
          <td class="replay">
            ${score.replayUrl ? `<a href="replay.html?hash=${score.sessionHash}" class="replay-link">▶️ Watch</a>` : '-'}
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        ${scores.length > 20 ? `<div class="leaderboard-note">Showing top 20 of ${scores.length} scores</div>` : ''}
      </div>
    `;

    this.container.innerHTML = html;

    // Add click handlers for replay links
    this.attachReplayHandlers();
  }

  /**
   * Get CSS class for leaderboard row based on score
   */
  getRowClass(score) {
    const classes = [];

    // Highlight top 3
    if (score.rank <= 3) {
      classes.push(`top-${score.rank}`);
    }

    // Mark suspicious scores
    const flags = score.votes?.flags || 0;
    if (flags >= 5) {
      classes.push('flagged');
    }

    // Mark exceptional performance
    if (score.wpm >= 150) {
      classes.push('exceptional');
    }

    return classes.join(' ');
  }

  /**
   * Show loading state
   */
  showLoading() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="leaderboard-loading">
        <div class="spinner"></div>
        <p>Loading leaderboard...</p>
      </div>
    `;
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="leaderboard-empty">
        <h2>🏆 Leaderboard</h2>
        <p>No scores yet. Be the first to submit!</p>
      </div>
    `;
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

    return date.toLocaleDateString();
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Attach click handlers for replay links
   */
  attachReplayHandlers() {
    const replayLinks = this.container.querySelectorAll('.replay-link');

    replayLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // Allow default behavior (navigation) but could add tracking here
        console.log('Replay link clicked:', link.href);
      });
    });
  }

  /**
   * Refresh the leaderboard
   */
  async refresh() {
    await this.loadAndDisplay(true);
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  /**
   * Inject CSS styles
   */
  injectStyles() {
    if (document.getElementById('leaderboard-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'leaderboard-styles';
    style.textContent = `
      .leaderboard {
        background: #1a1a2e;
        border-radius: 10px;
        padding: 20px;
        color: white;
        font-family: monospace;
      }

      .leaderboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #16213e;
      }

      .leaderboard-header h2 {
        margin: 0;
        color: #00ff00;
        font-size: 1.5em;
      }

      .leaderboard-meta {
        font-size: 0.9em;
        color: #888;
      }

      .leaderboard-table {
        width: 100%;
        border-collapse: collapse;
      }

      .leaderboard-table thead {
        background: rgba(0, 255, 0, 0.1);
      }

      .leaderboard-table th {
        padding: 10px;
        text-align: left;
        color: #00ff00;
        border-bottom: 1px solid #00ff00;
      }

      .leaderboard-table td {
        padding: 8px 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .leaderboard-table tbody tr:hover {
        background: rgba(0, 255, 0, 0.05);
      }

      .leaderboard-table .rank {
        font-weight: bold;
        color: #ffd700;
        width: 60px;
      }

      .leaderboard-table .top-1 .rank { color: #ffd700; font-size: 1.2em; }
      .leaderboard-table .top-2 .rank { color: #c0c0c0; font-size: 1.1em; }
      .leaderboard-table .top-3 .rank { color: #cd7f32; font-size: 1.1em; }

      .leaderboard-table .player {
        font-weight: bold;
        color: #00ffff;
        letter-spacing: 0.1em;
      }

      .leaderboard-table .wpm {
        color: #00ff00;
        font-weight: bold;
      }

      .leaderboard-table .accuracy {
        color: #ffff00;
      }

      .leaderboard-table .stage {
        color: #ff00ff;
      }

      .leaderboard-table .votes {
        white-space: nowrap;
      }

      .vote-count {
        display: inline-block;
        margin-right: 10px;
        padding: 2px 6px;
        border-radius: 3px;
        background: rgba(0, 0, 0, 0.3);
        font-size: 0.9em;
      }

      .vote-count.thumbs-up {
        color: #00ff00;
      }

      .vote-count.flags {
        color: #ff4444;
      }

      .replay-link {
        color: #00ffff;
        text-decoration: none;
        padding: 2px 8px;
        border: 1px solid #00ffff;
        border-radius: 3px;
        transition: background 0.3s;
      }

      .replay-link:hover {
        background: rgba(0, 255, 255, 0.2);
      }

      .leaderboard-table .flagged {
        opacity: 0.6;
      }

      .leaderboard-table .flagged .flags {
        color: #ff0000;
        font-weight: bold;
      }

      .leaderboard-table .exceptional .wpm {
        color: #ffd700;
        text-shadow: 0 0 5px #ffd700;
      }

      .leaderboard-note {
        margin-top: 15px;
        text-align: center;
        color: #888;
        font-size: 0.9em;
      }

      .leaderboard-loading {
        text-align: center;
        padding: 40px;
        color: #00ff00;
      }

      .spinner {
        display: inline-block;
        width: 40px;
        height: 40px;
        border: 3px solid rgba(0, 255, 0, 0.3);
        border-top-color: #00ff00;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .leaderboard-empty {
        text-align: center;
        padding: 40px;
        color: #888;
      }

      .leaderboard-empty h2 {
        color: #00ff00;
      }
    `;

    document.head.appendChild(style);
  }
}

// Create and export singleton instance
const leaderboard = new Leaderboard();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = leaderboard;
}