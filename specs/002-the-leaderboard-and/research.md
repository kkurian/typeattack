# Research Notes: Leaderboard and Feedback System

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Created**: 2025-01-13
**Status**: Phase 0 Research

## Purpose

Document research findings for technical unknowns and integration patterns needed for implementation.

## Research Areas

### 1. Cloudflare Workers Queue API (Zero Dependencies)

**Research Question**: How to implement a lightweight queue API in Cloudflare Workers without npm dependencies?

**Findings**:

**Basic Worker Structure** (Pure JavaScript):
```javascript
// No imports needed - pure Web APIs
export default {
  async fetch(request, env) {
    // env.KV_NAMESPACE provides access to Cloudflare KV
    // request provides Web standard Request object

    if (request.method === 'POST') {
      const data = await request.json();
      // Store in KV with timestamp key
      const key = `queue:${Date.now()}:${crypto.randomUUID()}`;
      await env.LEADERBOARD_QUEUE.put(key, JSON.stringify(data));
      return new Response('OK', { status: 200 });
    }

    return new Response('Method not allowed', { status: 405 });
  }
};
```

**Key Patterns**:
- Use `crypto.randomUUID()` (Web Crypto API) for unique keys
- Use `Date.now()` for timestamp-based ordering
- KV namespace accessed via `env` parameter
- All storage is string-based (use `JSON.stringify`/`JSON.parse`)
- CORS headers needed for browser clients

**Rate Limiting Pattern**:
```javascript
// Track submissions by UID
const rateLimitKey = `ratelimit:${userId}`;
const lastSubmission = await env.LEADERBOARD_QUEUE.get(rateLimitKey);
const now = Date.now();

if (lastSubmission && now - parseInt(lastSubmission) < 60000) {
  // Less than 1 minute since last submission
  return new Response('Rate limited', { status: 429 });
}

await env.LEADERBOARD_QUEUE.put(rateLimitKey, now.toString(), {
  expirationTtl: 3600 // Expire after 1 hour
});
```

**Validation Pattern**:
```javascript
// Hash validation without external libraries
async function validateHash(sessionData) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(sessionData));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
```

**CORS Configuration**:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourusername.github.io',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle preflight
if (request.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

**Deployment**: Workers deployed via `wrangler.toml` config file (no build step needed for pure JS)

---

### 2. GitHub Actions Periodic Processing

**Research Question**: How to set up periodic GitHub Actions workflow to process Cloudflare KV queue?

**Findings**:

**Workflow Schedule Pattern**:
```yaml
name: Process Leaderboard Queue
on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:  # Allow manual triggers

jobs:
  process-queue:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          # No external dependencies - pure Python standard library
          python --version

      - name: Process Queue
        env:
          CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CF_KV_NAMESPACE_ID: ${{ secrets.CF_KV_NAMESPACE_ID }}
        run: |
          python scripts/process-queue.py

      - name: Commit updated leaderboard
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/leaderboard.json data/feedback.json data/replays/
          git diff --quiet && git diff --staged --quiet || git commit -m "Update leaderboard data"
          git push
```

**Cloudflare KV API Access** (Python without external libraries):
```python
import urllib.request
import urllib.parse
import json
import os

def fetch_queue_items():
    """Fetch all queue items from Cloudflare KV"""
    account_id = os.environ['CF_ACCOUNT_ID']
    namespace_id = os.environ['CF_KV_NAMESPACE_ID']
    api_token = os.environ['CF_API_TOKEN']

    # List all keys starting with 'queue:'
    url = f'https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/keys?prefix=queue:'

    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {api_token}')

    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        return data['result']  # Returns list of {name, expiration, metadata}
```

**Key Patterns**:
- Use `workflow_dispatch` for manual testing during development
- Store secrets in GitHub repository settings (CF_ACCOUNT_ID, CF_API_TOKEN, etc.)
- Use standard library only (urllib, json) - no pip dependencies
- Commit generated files back to repository
- Use bot account for commits to avoid triggering workflows recursively

**Atomic Updates**: Write to temporary files, then rename to ensure atomic updates

---

### 3. Web Crypto API for Session Hashing

**Research Question**: How to generate deterministic session hashes client-side for anti-cheat?

**Findings**:

**Hash Generation Pattern**:
```javascript
async function generateSessionHash(sessionData) {
  // sessionData includes: words presented, keystroke timings, stage, seed
  // Must be deterministic - same session = same hash

  // Sort keys to ensure consistent ordering
  const sortedData = {
    words: sessionData.words.sort(),
    keystrokes: sessionData.keystrokes,  // Array of {key, timestamp, wordIndex}
    stage: sessionData.stage,
    seed: sessionData.seed  // Game RNG seed for word generation
  };

  // Convert to canonical JSON string
  const dataString = JSON.stringify(sortedData);

  // Generate SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}
```

**What to Include in Hash**:
- **Words presented**: Exact list of words that appeared (order matters)
- **Word RNG seed**: Seed used to generate words (prevents replaying different words)
- **Keystroke timings**: Array of all keystrokes with timestamps
- **Stage number**: Which stage this was from
- **Game configuration**: Speed multiplier, difficulty settings

**What NOT to Include**:
- User ID (assigned after submission)
- Submission timestamp (not part of gameplay)
- Vote counts (added after submission)
- Network latency (not reproducible)

**Validation Pattern** (Both client and server):
```javascript
// Client submits: sessionData + hash
// Server validates: recalculates hash from sessionData and compares

async function validateSubmission(submission) {
  const calculatedHash = await generateSessionHash(submission.sessionData);
  return calculatedHash === submission.sessionHash;
}
```

**Browser Compatibility**: `crypto.subtle` available in all modern browsers (Chrome 37+, Firefox 34+, Safari 11+)

---

### 4. Cookie Management (Never-Expiring Persistent UID)

**Research Question**: How to create persistent user identity cookies that never expire?

**Findings**:

**Cookie Creation Pattern**:
```javascript
function createUserIdentity(initials) {
  // Generate UUID v4
  const uuid = crypto.randomUUID();

  // Store in cookie with maximum expiration
  const maxDate = new Date('2038-01-19'); // JavaScript max safe date
  document.cookie = `typeattack_uid=${uuid}; expires=${maxDate.toUTCString()}; path=/; SameSite=Lax; Secure`;

  // Also store in localStorage as backup
  localStorage.setItem('typeattack_uid', uuid);
  localStorage.setItem('typeattack_initials', initials);
  localStorage.setItem('typeattack_created', Date.now().toString());

  return { uuid, initials };
}

function getUserIdentity() {
  // Try cookie first
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'typeattack_uid') {
      return {
        uuid: value,
        initials: localStorage.getItem('typeattack_initials'),
        created: parseInt(localStorage.getItem('typeattack_created'))
      };
    }
  }

  // Fallback to localStorage
  const uuid = localStorage.getItem('typeattack_uid');
  if (uuid) {
    // Restore cookie from localStorage
    const maxDate = new Date('2038-01-19');
    document.cookie = `typeattack_uid=${uuid}; expires=${maxDate.toUTCString()}; path=/; SameSite=Lax; Secure`;
    return {
      uuid,
      initials: localStorage.getItem('typeattack_initials'),
      created: parseInt(localStorage.getItem('typeattack_created'))
    };
  }

  return null;
}
```

**Key Patterns**:
- Use `crypto.randomUUID()` for collision-resistant IDs
- Set expiration to JavaScript's maximum safe date (2038-01-19)
- Use `SameSite=Lax` for CSRF protection
- Use `Secure` flag for HTTPS-only
- Dual storage (cookie + localStorage) for redundancy
- Cookie survives cache clear, localStorage survives cookie deletion

**Privacy Considerations**:
- No personal information stored (just UUID + initials)
- No tracking across domains (SameSite=Lax)
- User can manually delete cookie (transparent system)
- UUID doesn't reveal submission order or timing

---

### 5. Static JSON Generation and Serving

**Research Question**: How to generate and serve leaderboard/feedback data as static JSON files?

**Findings**:

**File Structure**:
```
data/
├── leaderboard.json          # Top scores list
├── feedback.json             # Feedback items list
└── replays/
    ├── abc123def456.json     # Individual replay files (keyed by session hash)
    ├── 789ghi012jkl.json
    └── ...
```

**Leaderboard Schema**:
```json
{
  "generated": 1705161234567,
  "version": 1,
  "scores": [
    {
      "rank": 1,
      "sessionHash": "abc123def456...",
      "userId": "uuid-here",
      "initials": "AAA",
      "wpm": 145,
      "accuracy": 98.5,
      "stage": 3,
      "timestamp": 1705161200000,
      "votes": {
        "up": 42,
        "flags": 1
      },
      "replayUrl": "data/replays/abc123def456.json"
    }
  ]
}
```

**Replay Schema**:
```json
{
  "sessionHash": "abc123def456...",
  "version": 1,
  "metadata": {
    "wpm": 145,
    "accuracy": 98.5,
    "stage": 3,
    "duration": 180000,
    "timestamp": 1705161200000
  },
  "gameState": {
    "seed": 12345,
    "words": ["hello", "world", "typing", "..."],
    "keystrokes": [
      {"key": "h", "timestamp": 100, "wordIndex": 0},
      {"key": "e", "timestamp": 180, "wordIndex": 0}
    ],
    "wordTimings": [
      {"wordIndex": 0, "spawnTime": 0, "completedTime": 850}
    ]
  },
  "votes": {
    "up": 42,
    "flags": 1
  }
}
```

**Feedback Schema**:
```json
{
  "generated": 1705161234567,
  "version": 1,
  "items": [
    {
      "id": "feedback-uuid",
      "type": "bug",
      "description": "Words overlapping in stage 5",
      "userId": "uuid-here",
      "context": {
        "stage": 5,
        "wpm": 120,
        "timestamp": 1705161200000
      },
      "votes": 15,
      "status": "open"
    }
  ]
}
```

**Generation Pattern** (Python):
```python
import json
import os

def generate_leaderboard(scores):
    """Generate leaderboard.json from processed scores"""
    leaderboard = {
        'generated': int(time.time() * 1000),
        'version': 1,
        'scores': []
    }

    # Sort by WPM descending
    sorted_scores = sorted(scores, key=lambda s: s['wpm'], reverse=True)

    for rank, score in enumerate(sorted_scores[:50], start=1):  # Store top 50
        leaderboard['scores'].append({
            'rank': rank,
            'sessionHash': score['sessionHash'],
            'userId': score['userId'],
            'initials': score['initials'],
            'wpm': score['wpm'],
            'accuracy': score['accuracy'],
            'stage': score['stage'],
            'timestamp': score['timestamp'],
            'votes': score['votes'],
            'replayUrl': f'data/replays/{score["sessionHash"]}.json'
        })

    # Write atomically
    temp_path = 'data/leaderboard.json.tmp'
    with open(temp_path, 'w') as f:
        json.dump(leaderboard, f, indent=2)
    os.rename(temp_path, 'data/leaderboard.json')
```

**Serving via GitHub Pages**:
- Files committed to `main` or `gh-pages` branch
- GitHub Pages serves with correct `Content-Type: application/json`
- CORS enabled by default for same-origin requests
- CDN caching provided by GitHub's infrastructure

**Client Loading Pattern**:
```javascript
async function loadLeaderboard() {
  const response = await fetch('data/leaderboard.json');
  if (!response.ok) {
    throw new Error('Failed to load leaderboard');
  }
  return await response.json();
}
```

**Cache Busting**: Include `generated` timestamp in JSON, client checks for updates

---

### 6. Replay Playback Engine

**Research Question**: How to recreate full visual game experience from session data?

**Findings**:

**Replay Engine Architecture**:
```javascript
class ReplayEngine {
  constructor(replayData, canvas) {
    this.data = replayData;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.startTime = null;
    this.currentTime = 0;
    this.isPlaying = false;

    // Reconstruct game state
    this.words = this.reconstructWords();
    this.keystrokes = replayData.gameState.keystrokes;
    this.keystrokeIndex = 0;
  }

  reconstructWords() {
    // Use same word generator with recorded seed
    const seed = this.data.gameState.seed;
    const words = this.data.gameState.words;

    return words.map((text, index) => {
      const timing = this.data.gameState.wordTimings[index];
      return {
        text,
        spawnTime: timing.spawnTime,
        completedTime: timing.completedTime,
        position: this.calculatePosition(timing.spawnTime)
      };
    });
  }

  play() {
    this.isPlaying = true;
    this.startTime = performance.now();
    this.animate();
  }

  animate = (timestamp) => {
    if (!this.isPlaying) return;

    if (!this.startTime) this.startTime = timestamp;
    this.currentTime = timestamp - this.startTime;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Render words at current time
    this.renderWords(this.currentTime);

    // Process keystrokes up to current time
    this.processKeystrokes(this.currentTime);

    // Continue animation
    if (this.currentTime < this.data.metadata.duration) {
      requestAnimationFrame(this.animate);
    } else {
      this.isPlaying = false;
      this.onComplete();
    }
  }

  renderWords(currentTime) {
    this.words.forEach(word => {
      if (currentTime >= word.spawnTime && currentTime <= word.completedTime) {
        // Calculate word position based on time elapsed
        const elapsed = currentTime - word.spawnTime;
        const progress = elapsed / (word.completedTime - word.spawnTime);
        const y = progress * this.canvas.height;

        // Draw word (yellow color, same as game)
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '24px monospace';
        this.ctx.fillText(word.text, word.position.x, y);
      }
    });
  }

  processKeystrokes(currentTime) {
    // Show keystroke effects (lasers, explosions) at recorded times
    while (this.keystrokeIndex < this.keystrokes.length) {
      const keystroke = this.keystrokes[this.keystrokeIndex];
      if (keystroke.timestamp > currentTime) break;

      // Trigger visual effect
      this.showLaserEffect(keystroke);
      this.keystrokeIndex++;
    }
  }

  showLaserEffect(keystroke) {
    // Same laser effect as live game
    const word = this.words[keystroke.wordIndex];
    // ... render laser animation
  }
}
```

**Key Patterns**:
- Use `requestAnimationFrame` for smooth 60fps playback
- Reconstruct game state from seed + recorded data
- Replay keystrokes at exact recorded timestamps
- Show same visual effects (lasers, explosions) as live game
- Support playback controls (play, pause, seek, speed)

**Performance Considerations**:
- Replay data can be large (100+ KB for long games)
- Lazy load replay files only when requested
- Use same rendering code as live game (consistency)
- Cache reconstructed word positions

**Validation During Playback**:
- Verify hash matches during reconstruction
- Detect tampering if positions don't match keystrokes
- Display warning if replay data inconsistent

---

## Open Questions

None - all technical unknowns have been researched.

## Next Steps

Proceed to Phase 1: Create data model, contracts, and quickstart documentation based on research findings.
