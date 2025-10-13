# Quickstart Guide: Leaderboard and Feedback System

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Created**: 2025-01-13
**Status**: Phase 1 Design

## Purpose

Step-by-step guide to set up and test the leaderboard and feedback system locally and in production.

---

## Prerequisites

### Required Accounts

1. **GitHub Account**: For repository hosting and GitHub Pages
2. **Cloudflare Account**: For Workers and KV storage (free tier sufficient)

### Required Tools

- **Git**: Version control
- **Python 3.11+**: For GitHub Actions processing scripts (standard library only, no pip)
- **Node.js**: Not required (no npm dependencies)
- **Web Browser**: Chrome, Firefox, or Safari (modern version)
- **Text Editor**: VS Code, Sublime Text, or any editor

### Optional Tools

- **curl**: For testing API endpoints
- **jq**: For validating JSON files
- **wrangler**: Cloudflare Workers CLI (for local development)

---

## Part 1: Cloudflare Setup

### Step 1: Create Cloudflare KV Namespace

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **KV**
3. Click **Create a namespace**
4. Name: `typeattack_leaderboard_queue`
5. Click **Add**
6. Note the **Namespace ID** (looks like `abc123def456...`)

### Step 2: Create Cloudflare Worker

1. In Cloudflare Dashboard, go to **Workers & Pages**
2. Click **Create Application** → **Create Worker**
3. Name: `typeattack-api`
4. Click **Deploy** (will create default worker)
5. Click **Edit Code**
6. Replace default code with worker implementation (see `workers/score-submission-api.js`)
7. Click **Save and Deploy**

### Step 3: Bind KV Namespace to Worker

1. In worker settings, go to **Settings** → **Variables**
2. Under **KV Namespace Bindings**, click **Add binding**
3. Variable name: `LEADERBOARD_QUEUE`
4. KV namespace: Select `typeattack_leaderboard_queue`
5. Click **Save**

### Step 4: Configure CORS

1. In worker code, update `ALLOWED_ORIGIN`:
   ```javascript
   const ALLOWED_ORIGIN = 'https://yourusername.github.io';
   ```
2. Replace `yourusername` with your GitHub username
3. Save and deploy

### Step 5: Get API Token

1. In Cloudflare Dashboard, click profile icon → **My Profile**
2. Go to **API Tokens** → **Create Token**
3. Template: **Edit Cloudflare Workers**
4. Permissions:
   - Account → Workers KV Storage → Edit
   - Account → Workers Scripts → Edit
5. Click **Continue to summary** → **Create Token**
6. Copy the token (only shown once!)

### Step 6: Get Account ID

1. In Cloudflare Dashboard, go to **Workers & Pages**
2. In URL bar, note the account ID: `dash.cloudflare.com/{account-id}/...`
3. Or find in **Workers & Pages** → right sidebar under **Account ID**

---

## Part 2: GitHub Repository Setup

### Step 1: Set Up GitHub Secrets

1. In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** for each:
   - `CF_ACCOUNT_ID`: Your Cloudflare account ID
   - `CF_API_TOKEN`: Your Cloudflare API token (from Part 1, Step 5)
   - `CF_KV_NAMESPACE_ID`: Your KV namespace ID (from Part 1, Step 1)

### Step 2: Create Data Directories

```bash
cd /path/to/typeattack
mkdir -p data/replays
touch data/leaderboard.json
touch data/feedback.json
```

### Step 3: Initialize Leaderboard Data

Create `data/leaderboard.json`:
```json
{
  "generated": 0,
  "version": 1,
  "scores": []
}
```

Create `data/feedback.json`:
```json
{
  "generated": 0,
  "version": 1,
  "items": []
}
```

### Step 4: Commit Initial Data

```bash
git add data/
git commit -m "Initialize leaderboard data structure"
git push origin main
```

### Step 5: Enable GitHub Pages

1. In repository, go to **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **/(root)**
4. Click **Save**
5. Wait 1-2 minutes for deployment
6. Visit `https://yourusername.github.io/typeattack` to verify

---

## Part 3: GitHub Actions Setup

### Step 1: Create Workflow File

Create `.github/workflows/process-leaderboard-queue.yml`:

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
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Process queue
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
          git add data/
          git diff --quiet && git diff --staged --quiet || git commit -m "Update leaderboard data"
          git push
```

### Step 2: Commit Workflow

```bash
git add .github/workflows/process-leaderboard-queue.yml
git commit -m "Add GitHub Actions workflow for leaderboard processing"
git push origin main
```

### Step 3: Verify Workflow

1. Go to **Actions** tab in GitHub repository
2. Click **Process Leaderboard Queue** workflow
3. Click **Run workflow** (manual trigger)
4. Wait for completion (should be green checkmark)
5. Check **data/leaderboard.json** for updates

---

## Part 4: Local Development

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/typeattack.git
cd typeattack
```

### Step 2: Test Client-Side Code

1. Open `index.html` in browser (via `file://` or local server)
2. Play game and complete a stage
3. Open browser console (F12)
4. Verify User Identity creation:
   ```javascript
   console.log(getUserIdentity());
   // Should show: { uuid: "...", initials: "ABC", created: 1705161234567 }
   ```

### Step 3: Test API Locally (Optional)

If you have `wrangler` installed:

```bash
# Install wrangler (optional)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Run worker locally
cd workers
wrangler dev score-submission-api.js
```

This starts local worker at `http://localhost:8787`.

Update client code temporarily to use local endpoint:
```javascript
const API_URL = 'http://localhost:8787/api';
```

### Step 4: Test Score Submission

```bash
# Test health endpoint
curl http://localhost:8787/api/health

# Test score submission
curl -X POST http://localhost:8787/api/submit-score \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "initials": "TST",
    "sessionHash": "a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
    "sessionData": {
      "version": 1,
      "seed": 12345,
      "stage": 1,
      "duration": 60000,
      "words": [],
      "keystrokes": [],
      "stats": { "wpm": 100, "accuracy": 95, "totalKeystrokes": 50, "correctKeystrokes": 48, "wordsCompleted": 10 }
    }
  }'
```

### Step 5: Test Processing Script Locally

```bash
# Set environment variables
export CF_ACCOUNT_ID="your-account-id"
export CF_API_TOKEN="your-api-token"
export CF_KV_NAMESPACE_ID="your-namespace-id"

# Run processing script
python scripts/process-queue.py

# Verify output
cat data/leaderboard.json
```

---

## Part 5: End-to-End Testing

### Test Flow 1: First Score Submission

1. Open game in browser: `https://yourusername.github.io/typeattack`
2. Play game and complete stage 1
3. When prompted, enter initials: `TST`
4. Click **Submit Score**
5. Verify success message appears
6. Open browser console:
   ```javascript
   console.log(document.cookie);
   // Should show: typeattack_uid=...
   ```
7. Wait 15 minutes (or manually trigger workflow)
8. Refresh leaderboard page
9. Verify your score appears with initials `TST`

### Test Flow 2: Voting

1. Ensure you have a User Identity (completed Test Flow 1)
2. View leaderboard
3. Click thumbs up on any score
4. Verify vote count increases
5. Try clicking thumbs up again
6. Verify error message: "You have already voted on this item"

### Test Flow 3: Replay

1. On leaderboard, click **Watch Replay** for any score
2. Verify replay page loads
3. Click **Play**
4. Watch game replay (words moving, keystrokes appearing)
5. When complete, click thumbs up or flag
6. Verify vote recorded

### Test Flow 4: Feedback

1. Start playing game (type at least 3 words)
2. Click **Feedback** button
3. Select type: **Bug**
4. Enter description: "Test feedback from quickstart"
5. Click **Submit**
6. Wait 15 minutes (or manually trigger workflow)
7. Visit feedback page: `https://yourusername.github.io/typeattack/feedback.html`
8. Verify your feedback appears

---

## Part 6: Monitoring

### Cloudflare Worker Logs

1. In Cloudflare Dashboard, go to **Workers & Pages**
2. Click your worker (`typeattack-api`)
3. Go to **Logs** → **Begin log stream**
4. Trigger some API calls (submit score, vote, etc.)
5. Watch logs in real-time

### GitHub Actions Logs

1. In GitHub repository, go to **Actions** tab
2. Click on latest workflow run
3. Click **process-queue** job
4. Expand steps to see detailed logs
5. Check for errors or warnings

### Verify Data Integrity

```bash
# Clone latest data
git pull origin main

# Validate JSON syntax
jq . data/leaderboard.json
jq . data/feedback.json

# Check replay file count
ls data/replays/ | wc -l

# Verify all replay hashes match filenames
for file in data/replays/*.json; do
  hash=$(basename "$file" .json)
  stored_hash=$(jq -r .sessionHash "$file")
  if [ "$hash" != "$stored_hash" ]; then
    echo "ERROR: Hash mismatch in $file"
  fi
done
```

---

## Part 7: Troubleshooting

### Issue: Score Not Appearing on Leaderboard

**Possible Causes**:
1. Hash validation failed (client and server calculated different hashes)
2. Duplicate session hash (already submitted)
3. Rate limited (submitted too quickly)
4. GitHub Actions workflow not running

**Debugging**:
1. Check Cloudflare Worker logs for error messages
2. Verify hash calculation is deterministic (same session → same hash)
3. Check if workflow is enabled in GitHub Actions
4. Manually trigger workflow and check logs

### Issue: Worker Returns 500 Error

**Possible Causes**:
1. KV namespace not bound to worker
2. Invalid KV namespace ID
3. API token lacks permissions

**Debugging**:
1. Check worker settings → Variables → KV Namespace Bindings
2. Verify namespace ID matches in GitHub Secrets
3. Verify API token has "Workers KV Storage → Edit" permission
4. Check worker logs for specific error message

### Issue: CORS Errors in Browser Console

**Possible Causes**:
1. `ALLOWED_ORIGIN` in worker doesn't match GitHub Pages URL
2. Preflight OPTIONS request not handled

**Debugging**:
1. Verify `ALLOWED_ORIGIN` exactly matches (no trailing slash)
2. Check Network tab in browser DevTools for preflight request
3. Verify worker returns correct CORS headers

### Issue: GitHub Actions Not Running

**Possible Causes**:
1. Workflow file syntax error
2. Repository secrets not set
3. Actions disabled in repository settings

**Debugging**:
1. Validate YAML syntax: `yamllint .github/workflows/process-leaderboard-queue.yml`
2. Check repository **Settings** → **Secrets and variables** → **Actions**
3. Check **Settings** → **Actions** → **General** → "Allow all actions"

### Issue: Replays Not Loading

**Possible Causes**:
1. Replay file not generated (processing failed)
2. 404 error (wrong path or file deleted)
3. JSON parsing error (corrupted file)

**Debugging**:
1. Check if replay file exists: `data/replays/{hash}.json`
2. Validate JSON: `jq . data/replays/{hash}.json`
3. Check GitHub Actions logs for processing errors
4. Verify `replayUrl` in leaderboard.json is correct

---

## Part 8: Production Checklist

Before launching to users:

- [ ] Cloudflare Worker deployed and tested
- [ ] KV namespace created and bound
- [ ] CORS configured with correct GitHub Pages URL
- [ ] GitHub Secrets set (CF_ACCOUNT_ID, CF_API_TOKEN, CF_KV_NAMESPACE_ID)
- [ ] GitHub Actions workflow enabled and running every 15 minutes
- [ ] GitHub Pages enabled and serving site correctly
- [ ] Initial data files committed (leaderboard.json, feedback.json)
- [ ] End-to-end test completed (submit score → wait 15 min → see on leaderboard)
- [ ] Vote functionality tested
- [ ] Replay functionality tested
- [ ] Feedback functionality tested
- [ ] Monitoring set up (Cloudflare logs, GitHub Actions logs)
- [ ] Error handling tested (duplicate submission, rate limiting, invalid data)
- [ ] Browser console clear of errors
- [ ] All validation scripts pass

---

## Part 9: Maintenance

### Regular Tasks

**Weekly**:
- Review flagged scores in `data/leaderboard.json`
- Delete obviously cheated scores manually
- Respond to feedback items (update status to "acknowledged" or "resolved")

**Monthly**:
- Check Cloudflare KV storage usage (free tier: 1GB)
- Archive old replay files if storage grows large
- Review worker analytics for performance issues

### Manual Score Deletion

```bash
# 1. Clone repo
git pull origin main

# 2. Edit leaderboard.json, remove score entry
jq 'del(.scores[] | select(.sessionHash == "abc123..."))' data/leaderboard.json > data/leaderboard.tmp.json
mv data/leaderboard.tmp.json data/leaderboard.json

# 3. Delete replay file
rm data/replays/abc123....json

# 4. Commit changes
git add data/
git commit -m "Remove flagged score"
git push origin main
```

### Updating Feedback Status

```bash
# Mark feedback as resolved
jq '(.items[] | select(.id == "feedback-uuid")).status = "resolved"' data/feedback.json > data/feedback.tmp.json
mv data/feedback.tmp.json data/feedback.json

git add data/feedback.json
git commit -m "Mark feedback as resolved"
git push origin main
```

---

## Part 10: Advanced Configuration

### Adjust Processing Frequency

Edit `.github/workflows/process-leaderboard-queue.yml`:
```yaml
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes (more frequent)
    # or
    - cron: '0 * * * *'     # Every hour (less frequent)
```

### Increase Leaderboard Size

Edit `scripts/process-queue.py`:
```python
# Change from top 50 to top 100
sorted_scores = sorted(scores, key=lambda s: s['wpm'], reverse=True)[:100]
```

### Add Custom Validation Rules

Edit worker code:
```javascript
// Reject scores with WPM > 200
if (sessionData.stats.wpm > 200) {
  return new Response(JSON.stringify({
    success: false,
    error: 'SUSPICIOUS_SCORE',
    message: 'Score flagged for review'
  }), { status: 422, headers: corsHeaders });
}
```

---

## Support

For issues and questions:
- Check [data-model.md](./data-model.md) for schema details
- Check [contracts/cloudflare-worker-api.md](./contracts/cloudflare-worker-api.md) for API details
- Review GitHub Actions logs for processing errors
- Review Cloudflare Worker logs for API errors

---

## Next Steps

After setup is complete, proceed to:
1. **Phase 2**: Generate tasks.md via `/speckit.tasks` command
2. **Implementation**: Execute tasks to build the system
3. **Testing**: Comprehensive testing with real users
4. **Launch**: Deploy to production and announce to community
