# API Contract: Cloudflare Worker Endpoints

**Feature**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)
**Created**: 2025-01-13
**Status**: Phase 1 Design

## Purpose

Define API contracts for Cloudflare Workers endpoints used for score submission, voting, and feedback.

---

## Base Configuration

**Worker URL**: `https://typeattack-api.{username}.workers.dev`

**CORS Headers** (All Responses):
```
Access-Control-Allow-Origin: https://{username}.github.io
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 86400
```

**Rate Limiting** (All Endpoints):
- Uses `CF-Connecting-IP` header for anonymous requests
- Uses `userId` from request body for authenticated requests
- Returns `429 Too Many Requests` when limit exceeded
- Includes `Retry-After` header with seconds until reset

---

## Endpoint 1: Submit Score

### POST /api/submit-score

**Purpose**: Submit a game score with full session data for leaderboard placement.

**Request**:
```http
POST /api/submit-score HTTP/1.1
Host: typeattack-api.{username}.workers.dev
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "initials": "ABC",
  "sessionHash": "a3b2c1d4e5f6...",
  "sessionData": {
    "version": 1,
    "seed": 12345,
    "stage": 3,
    "duration": 180000,
    "words": [
      {
        "text": "hello",
        "spawnTime": 0,
        "completedTime": 850,
        "x": 100,
        "y": 0
      }
    ],
    "keystrokes": [
      {
        "key": "h",
        "timestamp": 100,
        "wordIndex": 0,
        "correct": true
      }
    ],
    "stats": {
      "wpm": 145.5,
      "accuracy": 98.5,
      "totalKeystrokes": 450,
      "correctKeystrokes": 443,
      "wordsCompleted": 87
    }
  }
}
```

**Request Schema**:
```typescript
interface SubmitScoreRequest {
  userId: string;           // UUIDv4 format
  initials: string;         // Exactly 3 uppercase letters A-Z
  sessionHash: string;      // 64 hex characters (SHA-256)
  sessionData: {
    version: number;        // Schema version (currently 1)
    seed: number;           // Positive integer
    stage: number;          // 1-N
    duration: number;       // Milliseconds
    words: Array<{
      text: string;
      spawnTime: number;
      completedTime: number;
      x: number;
      y: number;
    }>;
    keystrokes: Array<{
      key: string;          // Single character
      timestamp: number;    // Milliseconds from start
      wordIndex: number;    // Index into words array
      correct: boolean;
    }>;
    stats: {
      wpm: number;
      accuracy: number;     // 0-100
      totalKeystrokes: number;
      correctKeystrokes: number;
      wordsCompleted: number;
    };
  };
}
```

**Validation Rules**:
1. `userId` must be valid UUIDv4 format
2. `initials` must match `/^[A-Z]{3}$/`
3. `sessionHash` must be 64 hex characters
4. `sessionHash` must match recalculated hash from `sessionData`
5. `sessionHash` must not already exist in queue or leaderboard
6. `sessionData.version` must be 1
7. `sessionData.stats.wpm` must be 0-300
8. `sessionData.stats.accuracy` must be 0-100
9. Rate limit: 1 submission per 60 seconds per `userId`

**Success Response** (200 OK):
```json
{
  "success": true,
  "sessionHash": "a3b2c1d4e5f6...",
  "message": "Score submitted successfully",
  "estimatedProcessing": "15 minutes"
}
```

**Error Response** (400 Bad Request - Invalid Hash):
```json
{
  "success": false,
  "error": "INVALID_HASH",
  "message": "Session hash does not match calculated hash",
  "calculatedHash": "b4c3d2e1f0..."
}
```

**Error Response** (409 Conflict - Duplicate):
```json
{
  "success": false,
  "error": "DUPLICATE_SESSION",
  "message": "This game session has already been submitted"
}
```

**Error Response** (429 Too Many Requests):
```json
{
  "success": false,
  "error": "RATE_LIMITED",
  "message": "Too many submissions. Please wait before submitting again.",
  "retryAfter": 42
}
```

**Error Response** (422 Unprocessable Entity - Validation):
```json
{
  "success": false,
  "error": "VALIDATION_FAILED",
  "message": "Invalid request data",
  "details": [
    "initials must be exactly 3 uppercase letters",
    "wpm must be between 0 and 300"
  ]
}
```

---

## Endpoint 2: Submit Vote

### POST /api/submit-vote

**Purpose**: Record a thumbs up or flag vote on a score or replay.

**Request**:
```http
POST /api/submit-vote HTTP/1.1
Host: typeattack-api.{username}.workers.dev
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "targetHash": "a3b2c1d4e5f6...",
  "targetType": "score",
  "voteType": "up"
}
```

**Request Schema**:
```typescript
interface SubmitVoteRequest {
  userId: string;           // UUIDv4 format
  targetHash: string;       // 64 hex characters (session hash)
  targetType: "score" | "replay";
  voteType: "up" | "flag";
}
```

**Validation Rules**:
1. `userId` must be valid UUIDv4 format
2. `targetHash` must be 64 hex characters
3. `targetType` must be "score" or "replay"
4. `voteType` must be "up" or "flag"
5. User must not have already voted on this target (check KV key `vote:{targetHash}:{userId}`)
6. Rate limit: 10 votes per 60 minutes per `userId`

**Success Response** (200 OK):
```json
{
  "success": true,
  "voteType": "up",
  "message": "Vote recorded successfully"
}
```

**Error Response** (409 Conflict - Already Voted):
```json
{
  "success": false,
  "error": "ALREADY_VOTED",
  "message": "You have already voted on this item"
}
```

**Error Response** (404 Not Found - Target Doesn't Exist):
```json
{
  "success": false,
  "error": "TARGET_NOT_FOUND",
  "message": "The score or replay you're trying to vote on does not exist"
}
```

**Error Response** (429 Too Many Requests):
```json
{
  "success": false,
  "error": "RATE_LIMITED",
  "message": "Too many votes. Please wait before voting again.",
  "retryAfter": 120
}
```

---

## Endpoint 3: Submit Feedback

### POST /api/submit-feedback

**Purpose**: Submit bug report or feature request with game context.

**Request**:
```http
POST /api/submit-feedback HTTP/1.1
Host: typeattack-api.{username}.workers.dev
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "bug",
  "description": "Words overlapping in stage 5 when typing speed exceeds 150 WPM",
  "gameContext": {
    "stage": 5,
    "wpm": 152.3,
    "accuracy": 97.8,
    "sessionHash": null
  }
}
```

**Request Schema**:
```typescript
interface SubmitFeedbackRequest {
  userId: string;           // UUIDv4 format
  type: "bug" | "feature";
  description: string;      // 1-1000 characters
  gameContext: {
    stage: number | null;
    wpm: number | null;
    accuracy: number | null;
    sessionHash: string | null;  // 64 hex chars if game completed
  };
}
```

**Validation Rules**:
1. `userId` must be valid UUIDv4 format
2. `type` must be "bug" or "feature"
3. `description` must be 1-1000 characters
4. `description` must not be empty or only whitespace
5. If `gameContext.sessionHash` provided, must be 64 hex characters
6. Rate limit: 5 feedback items per 60 minutes per `userId`

**Success Response** (200 OK):
```json
{
  "success": true,
  "feedbackId": "feedback-uuid-here",
  "message": "Feedback submitted successfully. Thank you for helping improve TypeAttack!",
  "estimatedProcessing": "15 minutes"
}
```

**Error Response** (422 Unprocessable Entity - Validation):
```json
{
  "success": false,
  "error": "VALIDATION_FAILED",
  "message": "Invalid feedback data",
  "details": [
    "description must be between 1 and 1000 characters",
    "type must be 'bug' or 'feature'"
  ]
}
```

**Error Response** (429 Too Many Requests):
```json
{
  "success": false,
  "error": "RATE_LIMITED",
  "message": "Too many feedback submissions. Please wait before submitting again.",
  "retryAfter": 300
}
```

---

## Endpoint 4: Vote on Feedback

### POST /api/vote-feedback

**Purpose**: Upvote a feedback item to help prioritize.

**Request**:
```http
POST /api/vote-feedback HTTP/1.1
Host: typeattack-api.{username}.workers.dev
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "feedbackId": "feedback-uuid-here"
}
```

**Request Schema**:
```typescript
interface VoteFeedbackRequest {
  userId: string;           // UUIDv4 format
  feedbackId: string;       // UUIDv4 format
}
```

**Validation Rules**:
1. `userId` must be valid UUIDv4 format
2. `feedbackId` must be valid UUIDv4 format
3. User must not have already voted on this feedback (check KV key `feedback-vote:{feedbackId}:{userId}`)
4. Rate limit: 20 feedback votes per 60 minutes per `userId`

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Feedback upvoted successfully"
}
```

**Error Response** (409 Conflict - Already Voted):
```json
{
  "success": false,
  "error": "ALREADY_VOTED",
  "message": "You have already upvoted this feedback"
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "error": "FEEDBACK_NOT_FOUND",
  "message": "The feedback item does not exist"
}
```

---

## Endpoint 5: Health Check

### GET /api/health

**Purpose**: Verify worker is operational.

**Request**:
```http
GET /api/health HTTP/1.1
Host: typeattack-api.{username}.workers.dev
```

**Success Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": 1705161234567,
  "version": "1.0.0"
}
```

---

## Common Error Responses

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred. Please try again later."
}
```

### 503 Service Unavailable
```json
{
  "success": false,
  "error": "SERVICE_UNAVAILABLE",
  "message": "The service is temporarily unavailable. Please try again in a few minutes."
}
```

---

## Rate Limiting Details

### Limits by Endpoint

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| /api/submit-score | 1 request | 60 seconds | userId |
| /api/submit-vote | 10 requests | 60 minutes | userId |
| /api/submit-feedback | 5 requests | 60 minutes | userId |
| /api/vote-feedback | 20 requests | 60 minutes | userId |

### Implementation

Rate limits tracked in Cloudflare KV with keys:
- `ratelimit:score:{userId}` → Last submission timestamp
- `ratelimit:vote:{userId}` → Array of last 10 vote timestamps
- `ratelimit:feedback:{userId}` → Array of last 5 feedback timestamps
- `ratelimit:feedback-vote:{userId}` → Array of last 20 vote timestamps

**Algorithm**:
1. Retrieve rate limit data from KV
2. Filter out timestamps outside the window
3. If count >= limit, return 429 with `Retry-After` header
4. Otherwise, add current timestamp and update KV
5. Set TTL to window duration

---

## Security Considerations

**Input Validation**:
- All JSON inputs validated against schema
- Reject oversized payloads (max 1MB)
- Sanitize description text (no HTML/scripts)

**Hash Validation**:
- Always recalculate hash server-side
- Compare using constant-time comparison to prevent timing attacks

**Duplicate Detection**:
- Check KV for existing `queue:{sessionHash}` keys
- Check static leaderboard.json (cached in worker memory)

**CORS**:
- Only allow requests from GitHub Pages domain
- No wildcard origins

**Secrets**:
- KV namespace ID stored in worker environment variables
- No secrets in client-side code

---

## Testing

### Manual Testing

```bash
# Submit score
curl -X POST https://typeattack-api.{username}.workers.dev/api/submit-score \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "initials": "ABC",
    "sessionHash": "a3b2c1d4e5f6...",
    "sessionData": {...}
  }'

# Submit vote
curl -X POST https://typeattack-api.{username}.workers.dev/api/submit-vote \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "targetHash": "a3b2c1d4e5f6...",
    "targetType": "score",
    "voteType": "up"
  }'

# Health check
curl https://typeattack-api.{username}.workers.dev/api/health
```

### Integration Testing

See `specs/002-the-leaderboard-and/quickstart.md` for local testing setup.

---

## Monitoring

**Metrics to Track**:
- Request count by endpoint
- Error rate by error type
- Rate limit hits
- Response times (p50, p95, p99)
- Queue size growth rate

**Cloudflare Analytics**: Available in Cloudflare dashboard under Workers > Analytics

**Custom Logging**:
```javascript
console.log({
  event: 'score_submitted',
  userId: userId,
  sessionHash: sessionHash,
  wpm: sessionData.stats.wpm,
  timestamp: Date.now()
});
```

Logs viewable in Cloudflare dashboard under Workers > Logs (Live Tail).
