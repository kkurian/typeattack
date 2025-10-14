# Leaderboard Deployment Guide

## Prerequisites
- Cloudflare account with Workers enabled
- GitHub repository secrets configured (✅ Already done)
- KV namespace created (✅ Already done - named "typeattack")

## Step 1: Deploy Cloudflare Worker

### Option A: Using Wrangler CLI (Recommended)

1. Install Wrangler globally (one-time setup):
   ```bash
   npm install -g wrangler
   ```

2. Update `wrangler.toml` with your actual values:
   - Replace `YOUR_ACCOUNT_ID` with your Cloudflare account ID
   - Replace `YOUR_KV_NAMESPACE_ID` with the ID of your "typeattack" namespace

3. Login to Cloudflare:
   ```bash
   wrangler login
   ```

4. Deploy the worker:
   ```bash
   wrangler deploy
   ```

5. Note the worker URL (e.g., `https://typeattack-leaderboard.YOUR-SUBDOMAIN.workers.dev`)

### Option B: Using Cloudflare Dashboard

1. Go to Workers & Pages in Cloudflare dashboard
2. Click "Create Worker"
3. Name it "typeattack-leaderboard"
4. Copy the contents of `workers/leaderboard-api.js`
5. Paste into the worker editor
6. Go to Settings → Variables
7. Add KV Namespace binding:
   - Variable name: `LEADERBOARD_QUEUE`
   - KV Namespace: Select "typeattack"
8. Save and deploy

## Step 2: Update Client Configuration

1. Edit `js/score-submission.js`
2. Update line 8 with your worker URL:
   ```javascript
   this.apiUrl = 'https://YOUR-WORKER-URL.workers.dev/api/submit-score';
   ```

## Step 3: Test the System

### Local Testing
1. Open the game in your browser
2. Play until you reach 48 WPM for 1 minute
3. When the score submission modal appears:
   - Enter your 3-letter initials
   - Click Submit
4. Check browser console for any errors

### Verify Submission
1. Go to Cloudflare dashboard → Workers → KV
2. Select your "typeattack" namespace
3. Look for keys starting with `queue:`
4. You should see your submission queued

### Test GitHub Actions
1. Go to your GitHub repository
2. Navigate to Actions tab
3. Find "Process Leaderboard Queue"
4. Click "Run workflow" → "Run workflow"
5. Wait for completion
6. Check if `data/leaderboard.json` was updated

## Step 4: View Leaderboard

1. Add to your game page to display the leaderboard:
   ```javascript
   // Initialize leaderboard display
   leaderboard.init('leaderboard-container');
   ```

2. Make the container visible:
   ```javascript
   document.getElementById('leaderboard-container').style.display = 'block';
   ```

## Troubleshooting

### Worker Not Accepting Submissions
- Check CORS headers in worker
- Verify KV namespace binding is correct
- Check browser console for errors

### GitHub Actions Not Running
- Verify secrets are set correctly:
  - `CF_ACCOUNT_ID`
  - `CF_API_TOKEN`
  - `CF_KV_NAMESPACE_ID`
- Check Actions tab for error logs

### Leaderboard Not Updating
- Ensure GitHub Actions has write permissions
- Check if `data/leaderboard.json` exists
- Verify Python scripts have no syntax errors

## Production Checklist

- [ ] Update CORS origin from `*` to your actual domain
- [ ] Set appropriate rate limits in worker
- [ ] Configure custom domain (optional)
- [ ] Monitor KV usage and costs
- [ ] Set up alerts for failed GitHub Actions
- [ ] Implement backup strategy for leaderboard data

## API Endpoints

Your worker provides these endpoints:

- `GET /health` - Health check
- `POST /api/submit-score` - Submit a score
- `POST /api/submit-vote` - Vote on a score
- `POST /api/submit-feedback` - Submit feedback
- `POST /api/vote-feedback` - Vote on feedback

## Cost Estimates

- Cloudflare Workers: Free tier includes 100,000 requests/day
- Cloudflare KV: Free tier includes 100,000 reads/day, 1,000 writes/day
- GitHub Actions: Free for public repos, 2,000 minutes/month for private

For a typical game with 100 daily players:
- ~100 score submissions/day (writes)
- ~1,000 leaderboard views/day (reads from static JSON)
- ~96 GitHub Actions runs/day (every 15 minutes)
- **Total cost: $0 (within free tiers)**