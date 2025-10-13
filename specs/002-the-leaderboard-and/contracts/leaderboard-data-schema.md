# Data Schema: Static JSON Files

**Feature**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)
**Created**: 2025-01-13
**Status**: Phase 1 Design

## Purpose

Define schemas for static JSON files served via GitHub Pages for leaderboard and feedback display.

---

## File 1: leaderboard.json

**Location**: `/data/leaderboard.json`

**Purpose**: Public leaderboard showing top scores with metadata and links to replays.

**Update Frequency**: Every 15 minutes (GitHub Actions cron)

**Schema**:
```typescript
interface Leaderboard {
  generated: number;        // Unix timestamp (milliseconds) of generation
  version: number;          // Schema version (currently 1)
  scores: Score[];          // Array of score entries (max 50)
}

interface Score {
  rank: number;             // Position on leaderboard (1-50)
  sessionHash: string;      // 64 hex characters (SHA-256)
  userId: string;           // UUIDv4 of player
  initials: string;         // 3 uppercase letters
  wpm: number;              // Words per minute (decimal)
  accuracy: number;         // Percentage 0-100 (decimal)
  stage: number;            // Stage reached (1-N)
  timestamp: number;        // Submission time (Unix ms)
  votes: {
    up: number;             // Thumbs up count
    flags: number;          // Flag count
  };
  replayUrl: string;        // Relative path to replay JSON
}
```

**Example**:
```json
{
  "generated": 1705161234567,
  "version": 1,
  "scores": [
    {
      "rank": 1,
      "sessionHash": "a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "initials": "AAA",
      "wpm": 145.5,
      "accuracy": 98.5,
      "stage": 3,
      "timestamp": 1705161200000,
      "votes": {
        "up": 42,
        "flags": 1
      },
      "replayUrl": "data/replays/a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2.json"
    },
    {
      "rank": 2,
      "sessionHash": "b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3",
      "userId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "initials": "BBB",
      "wpm": 142.3,
      "accuracy": 99.1,
      "stage": 3,
      "timestamp": 1705160800000,
      "votes": {
        "up": 38,
        "flags": 0
      },
      "replayUrl": "data/replays/b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3.json"
    }
  ]
}
```

**Constraints**:
- `scores` array maximum length: 50
- Scores sorted by `wpm` descending
- If `votes.flags` > 10, score may be hidden (developer manual review)
- All `sessionHash` values must be unique
- `rank` must be sequential (1, 2, 3, ...)

**Client Usage**:
```javascript
// Load leaderboard
const response = await fetch('data/leaderboard.json');
const leaderboard = await response.json();

// Display top 20 scores
leaderboard.scores.slice(0, 20).forEach(score => {
  console.log(`${score.rank}. ${score.initials} - ${score.wpm} WPM`);
});

// Cache for 5 minutes
localStorage.setItem('leaderboard_cache', JSON.stringify(leaderboard));
localStorage.setItem('leaderboard_cache_time', Date.now());
```

---

## File 2: feedback.json

**Location**: `/data/feedback.json`

**Purpose**: Public feedback items (bugs and feature requests) with community voting.

**Update Frequency**: Every 15 minutes (GitHub Actions cron)

**Schema**:
```typescript
interface FeedbackList {
  generated: number;        // Unix timestamp (milliseconds) of generation
  version: number;          // Schema version (currently 1)
  items: FeedbackItem[];    // Array of feedback items
}

interface FeedbackItem {
  id: string;               // UUIDv4 of feedback item
  type: "bug" | "feature";
  description: string;      // User's description (1-1000 chars)
  userId: string;           // UUIDv4 of submitter
  timestamp: number;        // Submission time (Unix ms)
  context: {
    stage: number | null;
    wpm: number | null;
    accuracy: number | null;
    sessionHash: string | null;
  };
  votes: number;            // Upvote count
  status: "open" | "acknowledged" | "resolved";
}
```

**Example**:
```json
{
  "generated": 1705161234567,
  "version": 1,
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "type": "bug",
      "description": "Words overlapping in stage 5 when typing speed exceeds 150 WPM. Makes it hard to see which word to type next.",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": 1705161200000,
      "context": {
        "stage": 5,
        "wpm": 152.3,
        "accuracy": 97.8,
        "sessionHash": null
      },
      "votes": 15,
      "status": "open"
    },
    {
      "id": "9c6e7a23-45df-4b8c-a1e2-3d4f5a6b7c8d",
      "type": "feature",
      "description": "Add dark mode option in settings. Current bright theme hurts eyes during long sessions.",
      "userId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "timestamp": 1705160800000,
      "context": {
        "stage": null,
        "wpm": null,
        "accuracy": null,
        "sessionHash": null
      },
      "votes": 23,
      "status": "acknowledged"
    },
    {
      "id": "2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d",
      "type": "bug",
      "description": "Laser effect doesn't play when typing on macOS Safari. Works fine on Chrome.",
      "userId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "timestamp": 1705160400000,
      "context": {
        "stage": 2,
        "wpm": 95.6,
        "accuracy": 96.2,
        "sessionHash": "c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2"
      },
      "votes": 8,
      "status": "resolved"
    }
  ]
}
```

**Sorting**:
- Default: By `votes` descending (most voted first)
- Alternative: By `timestamp` descending (most recent first)
- Filter by `status` ("open" only, "acknowledged" only, etc.)
- Filter by `type` ("bug" only, "feature" only)

**Client Usage**:
```javascript
// Load feedback
const response = await fetch('data/feedback.json');
const feedbackList = await response.json();

// Sort by votes
const sortedItems = feedbackList.items.sort((a, b) => b.votes - a.votes);

// Filter open bugs only
const openBugs = feedbackList.items.filter(item =>
  item.type === 'bug' && item.status === 'open'
);
```

---

## File 3: replays/{sessionHash}.json

**Location**: `/data/replays/{sessionHash}.json`

**Purpose**: Individual replay file containing full game session data for visual recreation.

**Update Frequency**: Created when score is processed (every 15 minutes)

**Schema**:
```typescript
interface Replay {
  sessionHash: string;      // 64 hex characters (SHA-256)
  version: number;          // Schema version (currently 1)
  metadata: {
    userId: string;         // UUIDv4 of player
    initials: string;       // 3 uppercase letters
    wpm: number;            // Words per minute
    accuracy: number;       // Percentage 0-100
    stage: number;          // Stage reached
    duration: number;       // Session duration (milliseconds)
    timestamp: number;      // Submission time (Unix ms)
  };
  gameState: {
    seed: number;           // RNG seed for word generation
    words: Word[];          // Array of words that appeared
    keystrokes: Keystroke[]; // Array of all keystrokes
    stats: {
      totalKeystrokes: number;
      correctKeystrokes: number;
      wordsCompleted: number;
    };
  };
  votes: {
    up: number;             // Thumbs up count
    flags: number;          // Flag count
  };
}

interface Word {
  text: string;             // Word text (e.g., "hello")
  spawnTime: number;        // When word appeared (ms from start)
  completedTime: number;    // When word was completed (ms)
  x: number;                // Horizontal spawn position (px)
  y: number;                // Vertical spawn position (px, usually 0)
}

interface Keystroke {
  key: string;              // Key pressed (single character)
  timestamp: number;        // Time since session start (ms)
  wordIndex: number;        // Which word this targeted (index in words array)
  correct: boolean;         // Whether keystroke was correct
}
```

**Example**:
```json
{
  "sessionHash": "a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "version": 1,
  "metadata": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "initials": "AAA",
    "wpm": 145.5,
    "accuracy": 98.5,
    "stage": 3,
    "duration": 180000,
    "timestamp": 1705161200000
  },
  "gameState": {
    "seed": 12345,
    "words": [
      {
        "text": "hello",
        "spawnTime": 0,
        "completedTime": 850,
        "x": 100,
        "y": 0
      },
      {
        "text": "world",
        "spawnTime": 1000,
        "completedTime": 1920,
        "x": 250,
        "y": 0
      },
      {
        "text": "typing",
        "spawnTime": 2000,
        "completedTime": 3100,
        "x": 400,
        "y": 0
      }
    ],
    "keystrokes": [
      {
        "key": "h",
        "timestamp": 100,
        "wordIndex": 0,
        "correct": true
      },
      {
        "key": "e",
        "timestamp": 180,
        "wordIndex": 0,
        "correct": true
      },
      {
        "key": "l",
        "timestamp": 350,
        "wordIndex": 0,
        "correct": true
      },
      {
        "key": "l",
        "timestamp": 520,
        "wordIndex": 0,
        "correct": true
      },
      {
        "key": "o",
        "timestamp": 850,
        "wordIndex": 0,
        "correct": true
      },
      {
        "key": "w",
        "timestamp": 1200,
        "wordIndex": 1,
        "correct": true
      }
    ],
    "stats": {
      "totalKeystrokes": 450,
      "correctKeystrokes": 443,
      "wordsCompleted": 87
    }
  },
  "votes": {
    "up": 42,
    "flags": 1
  }
}
```

**File Size Constraints**:
- Maximum file size: 500KB per replay
- If exceeds limit, truncate `keystrokes` array and add note
- Typical size: 50-200KB for 3-minute game

**Client Usage**:
```javascript
// Load replay
const sessionHash = 'a3b2c1d4e5f6...';
const response = await fetch(`data/replays/${sessionHash}.json`);
const replay = await response.json();

// Initialize replay engine
const engine = new ReplayEngine(replay, canvas);
engine.play();

// Verify hash matches
const calculatedHash = await generateSessionHash(replay.gameState);
if (calculatedHash !== replay.sessionHash) {
  console.error('Replay data tampered!');
}
```

**Validation**:
- Client MUST verify `sessionHash` matches recalculated hash
- If mismatch detected, display warning: "⚠️ Replay data may be corrupted"
- Keystrokes must align with word completion times (sanity check)

---

## File 4: stats.json (Optional Future Enhancement)

**Location**: `/data/stats.json`

**Purpose**: Aggregate statistics across all players.

**Schema**:
```typescript
interface Stats {
  generated: number;
  version: number;
  totals: {
    totalPlayers: number;       // Unique user IDs
    totalScores: number;        // Total submissions
    totalVotes: number;         // Total votes cast
    totalFeedback: number;      // Total feedback items
  };
  averages: {
    avgWpm: number;
    avgAccuracy: number;
    avgStageReached: number;
  };
  distributions: {
    wpmBuckets: { [key: string]: number };  // "0-50": 12, "50-100": 45, ...
    stageBuckets: { [key: string]: number }; // "1": 234, "2": 156, ...
  };
}
```

**Note**: Not required for MVP, but useful for community dashboard.

---

## Schema Versioning

All schemas include `version` field for forward compatibility.

**Current Version**: 1

**Version History**:
- Version 1 (2025-01-13): Initial schema

**Migration Strategy**:
1. Client checks `version` field when loading data
2. If `version > knownVersion`, show update prompt: "A new version of TypeAttack is available. Please refresh."
3. Server always outputs current version only
4. Breaking changes require version bump and migration script

---

## File Locations Summary

```
data/
├── leaderboard.json          # Top 50 scores (updated every 15 min)
├── feedback.json             # All feedback items (updated every 15 min)
├── stats.json                # [Future] Aggregate statistics
└── replays/
    ├── {hash1}.json          # Individual replay files
    ├── {hash2}.json
    ├── {hash3}.json
    └── ...                   # One file per submitted score
```

**Total Storage Estimate**:
- `leaderboard.json`: ~50KB (50 scores × ~1KB each)
- `feedback.json`: ~100KB (100 items × ~1KB each)
- `replays/`: ~10MB (50 replays × ~200KB each)
- **Total**: ~10MB (well within GitHub Pages limits)

---

## Caching Strategy

**Client-Side Caching**:
- `leaderboard.json`: Cache for 5 minutes in localStorage
- `feedback.json`: Cache for 10 minutes in localStorage
- `replays/*.json`: Cache indefinitely (immutable once created)

**CDN Caching** (GitHub Pages):
- Automatic CDN caching by GitHub
- Cache invalidation on git push (GitHub Pages rebuilds)
- Typical CDN propagation: ~1 minute

**Cache Headers** (Set by GitHub Pages):
```
Cache-Control: max-age=600  # 10 minutes
ETag: "abc123..."
```

**Client Cache-Busting**:
```javascript
// Check if cached data is stale
const cached = JSON.parse(localStorage.getItem('leaderboard_cache'));
const cacheTime = parseInt(localStorage.getItem('leaderboard_cache_time'));
const now = Date.now();

if (cached && now - cacheTime < 300000) {  // 5 minutes
  // Use cached data
  displayLeaderboard(cached);
} else {
  // Fetch fresh data
  const response = await fetch('data/leaderboard.json');
  const leaderboard = await response.json();
  localStorage.setItem('leaderboard_cache', JSON.stringify(leaderboard));
  localStorage.setItem('leaderboard_cache_time', now.toString());
  displayLeaderboard(leaderboard);
}
```

---

## Error Handling

**404 Not Found** (Replay doesn't exist):
```javascript
try {
  const response = await fetch(`data/replays/${hash}.json`);
  if (!response.ok) throw new Error('Replay not found');
  const replay = await response.json();
} catch (error) {
  displayError('This replay is not available. It may have been removed.');
}
```

**Invalid JSON**:
```javascript
try {
  const replay = await response.json();
} catch (error) {
  displayError('Failed to load replay data. Please try again later.');
}
```

**Version Mismatch**:
```javascript
const replay = await response.json();
if (replay.version > CURRENT_VERSION) {
  displayWarning('This replay was created with a newer version. Please refresh your browser.');
}
```

---

## Performance Considerations

**Lazy Loading**:
- Don't load replay files until user clicks "Watch Replay"
- Load leaderboard immediately on page load
- Load feedback only on feedback page

**Compression**:
- GitHub Pages automatically serves gzip/brotli compressed files
- JSON minified (no pretty-printing in production)

**Pagination** (Future Enhancement):
- If leaderboard grows beyond 50 scores, split into pages
- `leaderboard-page1.json`, `leaderboard-page2.json`, etc.

---

## Security Considerations

**Data Integrity**:
- All replay files include `sessionHash` for verification
- Client MUST verify hash matches data
- Display warning if tampering detected

**Privacy**:
- No IP addresses or email addresses stored
- User IDs are random UUIDs (no personal info)
- Initials only (no full names)

**Content Moderation**:
- Feedback descriptions sanitized (no HTML tags)
- Developer can manually delete replays/feedback if inappropriate
- Flagged content reviewed manually

---

## Testing

**Validation Script**:
```python
import json
import jsonschema

# Define JSON schema
leaderboard_schema = {
  "type": "object",
  "required": ["generated", "version", "scores"],
  "properties": {
    "generated": {"type": "number"},
    "version": {"type": "number"},
    "scores": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "type": "object",
        "required": ["rank", "sessionHash", "userId", "initials", "wpm", "accuracy"],
        # ... full schema
      }
    }
  }
}

# Validate generated file
with open('data/leaderboard.json') as f:
  data = json.load(f)
  jsonschema.validate(data, leaderboard_schema)
  print("✓ leaderboard.json is valid")
```

**Manual Testing**:
```bash
# Validate JSON syntax
jq . data/leaderboard.json

# Check file size
du -h data/replays/*.json

# Count replays
ls data/replays/ | wc -l
```
