/**
 * Cloudflare Worker for Leaderboard API
 * Handles score submission, voting, and feedback endpoints
 *
 * Environment variables required:
 * - LEADERBOARD_QUEUE: KV namespace binding
 * - ALLOWED_ORIGIN: Origin for CORS (e.g., https://yourgame.com)
 */

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: Update with actual domain in production
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

// Standard JSON response headers
const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
};

/**
 * Main request handler
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (path === '/health' && method === 'GET') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: Date.now(),
        version: '1.0.0'
      }), {
        headers: jsonHeaders,
        status: 200
      });
    }

    // Score submission endpoint
    if (path === '/api/submit-score' && method === 'POST') {
      return handleScoreSubmission(request, env);
    }

    // Vote submission endpoint
    if (path === '/api/submit-vote' && method === 'POST') {
      return handleVoteSubmission(request, env);
    }

    // Feedback submission endpoint
    if (path === '/api/submit-feedback' && method === 'POST') {
      return handleFeedbackSubmission(request, env);
    }

    // Feedback voting endpoint
    if (path === '/api/vote-feedback' && method === 'POST') {
      return handleFeedbackVote(request, env);
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({
      error: 'Not Found',
      path: path,
      method: method
    }), {
      headers: jsonHeaders,
      status: 404
    });
  }
};

/**
 * Helper function to validate request body
 */
function validateRequestBody(body, requiredFields) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  for (const field of requiredFields) {
    if (!(field in body)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  return { valid: true };
}

/**
 * Helper function to generate UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Helper function for rate limiting
 */
async function checkRateLimit(env, userId, limitType, maxRequests, windowMs) {
  const key = `ratelimit:${limitType}:${userId}`;
  const now = Date.now();

  // Get existing rate limit data
  const data = await env.LEADERBOARD_QUEUE.get(key, { type: 'json' });

  if (!data) {
    // First request
    await env.LEADERBOARD_QUEUE.put(key, JSON.stringify({
      count: 1,
      windowStart: now
    }), {
      expirationTtl: Math.ceil(windowMs / 1000)
    });
    return { allowed: true };
  }

  // Check if window has expired
  if (now - data.windowStart > windowMs) {
    // New window
    await env.LEADERBOARD_QUEUE.put(key, JSON.stringify({
      count: 1,
      windowStart: now
    }), {
      expirationTtl: Math.ceil(windowMs / 1000)
    });
    return { allowed: true };
  }

  // Within current window
  if (data.count >= maxRequests) {
    const retryAfter = Math.ceil((data.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment counter
  await env.LEADERBOARD_QUEUE.put(key, JSON.stringify({
    count: data.count + 1,
    windowStart: data.windowStart
  }), {
    expirationTtl: Math.ceil(windowMs / 1000)
  });

  return { allowed: true };
}

/**
 * Handle score submission
 * T018-T022, T091-T092: Validate and queue score submissions
 */
async function handleScoreSubmission(request, env) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields (T018)
    const validation = validateRequestBody(body, ['userId', 'initials', 'sessionHash', 'sessionData']);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: validation.error
      }), {
        headers: jsonHeaders,
        status: 400
      });
    }

    // Validate initials (T092)
    if (!/^[A-Z]{3}$/.test(body.initials)) {
      return new Response(JSON.stringify({
        error: 'Initials must be exactly 3 uppercase letters'
      }), {
        headers: jsonHeaders,
        status: 400
      });
    }

    // Validate session hash (T019)
    const sessionData = body.sessionData;
    if (!sessionData || typeof sessionData !== 'object') {
      return new Response(JSON.stringify({
        error: 'Invalid session data'
      }), {
        headers: jsonHeaders,
        status: 400
      });
    }

    // Basic hash validation - check it exists and is correct length
    const sessionHash = body.sessionHash;
    if (!sessionHash || sessionHash.length !== 64) {
      return new Response(JSON.stringify({
        error: 'Invalid session hash'
      }), {
        headers: jsonHeaders,
        status: 400
      });
    }

    // Check for duplicate submission (T020)
    const existingSubmission = await env.LEADERBOARD_QUEUE.get(`queue:*:${sessionHash}`, { type: 'json' });
    if (existingSubmission) {
      return new Response(JSON.stringify({
        error: 'Duplicate submission'
      }), {
        headers: jsonHeaders,
        status: 409
      });
    }

    // Rate limiting (T021)
    const rateLimit = await checkRateLimit(env, body.userId, 'score', 1, 60000); // 1 per minute
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limited',
        retryAfter: rateLimit.retryAfter
      }), {
        headers: jsonHeaders,
        status: 429
      });
    }

    // Queue the submission (T022)
    const timestamp = Date.now();
    const uuid = generateUUID();
    const queueKey = `queue:${timestamp}:${uuid}`;

    const queueData = {
      type: 'score',
      userId: body.userId,
      initials: body.initials,
      sessionHash: sessionHash,
      sessionData: sessionData,
      timestamp: timestamp
    };

    await env.LEADERBOARD_QUEUE.put(queueKey, JSON.stringify(queueData), {
      expirationTtl: 604800 // 7 days
    });

    // Return success
    return new Response(JSON.stringify({
      success: true,
      userId: body.userId,
      message: 'Score queued for processing'
    }), {
      headers: jsonHeaders,
      status: 200
    });

  } catch (error) {
    console.error('Score submission error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      headers: jsonHeaders,
      status: 500
    });
  }
}

/**
 * Handle vote submission
 * T049-T052: Process votes on scores
 */
async function handleVoteSubmission(request, env) {
  try {
    const body = await request.json();

    // Validate required fields
    const validation = validateRequestBody(body, ['userId', 'targetHash', 'targetType', 'voteType']);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: validation.error
      }), {
        headers: jsonHeaders,
        status: 400
      });
    }

    // Validate vote type
    if (!['up', 'flag'].includes(body.voteType)) {
      return new Response(JSON.stringify({
        error: 'Invalid vote type'
      }), {
        headers: jsonHeaders,
        status: 400
      });
    }

    // Check for duplicate vote (T050)
    const voteKey = `vote:${body.targetHash}:${body.userId}`;
    const existingVote = await env.LEADERBOARD_QUEUE.get(voteKey);
    if (existingVote) {
      return new Response(JSON.stringify({
        error: 'Already voted on this item'
      }), {
        headers: jsonHeaders,
        status: 409
      });
    }

    // Rate limiting (T051)
    const rateLimit = await checkRateLimit(env, body.userId, 'vote', 10, 3600000); // 10 per hour
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limited',
        retryAfter: rateLimit.retryAfter
      }), {
        headers: jsonHeaders,
        status: 429
      });
    }

    // Store vote (T052)
    const voteData = {
      voteId: generateUUID(),
      userId: body.userId,
      targetHash: body.targetHash,
      targetType: body.targetType,
      voteType: body.voteType,
      timestamp: Date.now()
    };

    await env.LEADERBOARD_QUEUE.put(voteKey, JSON.stringify(voteData));

    return new Response(JSON.stringify({
      success: true,
      message: 'Vote recorded'
    }), {
      headers: jsonHeaders,
      status: 200
    });

  } catch (error) {
    console.error('Vote submission error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      headers: jsonHeaders,
      status: 500
    });
  }
}

/**
 * Handle feedback submission
 * T063-T065: Process feedback and bug reports
 */
async function handleFeedbackSubmission(request, env) {
  try {
    const body = await request.json();

    // Validate required fields
    const validation = validateRequestBody(body, ['userId', 'type', 'description']);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: validation.error
      }), {
        headers: jsonHeaders,
        status: 400
      });
    }

    // Validate feedback type
    if (!['bug', 'feature'].includes(body.type)) {
      return new Response(JSON.stringify({
        error: 'Invalid feedback type'
      }), {
        headers: jsonHeaders,
        status: 400
      });
    }

    // Validate description length (T063)
    if (body.description.length < 10 || body.description.length > 1000) {
      return new Response(JSON.stringify({
        error: 'Description must be between 10 and 1000 characters'
      }), {
        headers: jsonHeaders,
        status: 400
      });
    }

    // Rate limiting (T064)
    const rateLimit = await checkRateLimit(env, body.userId, 'feedback', 5, 3600000); // 5 per hour
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limited',
        retryAfter: rateLimit.retryAfter
      }), {
        headers: jsonHeaders,
        status: 429
      });
    }

    // Queue feedback (T065)
    const timestamp = Date.now();
    const uuid = generateUUID();
    const feedbackKey = `feedback:${timestamp}:${uuid}`;

    const feedbackData = {
      feedbackId: uuid,
      userId: body.userId,
      type: body.type,
      description: body.description,
      gameContext: body.gameContext || {},
      timestamp: timestamp
    };

    await env.LEADERBOARD_QUEUE.put(feedbackKey, JSON.stringify(feedbackData), {
      expirationTtl: 2592000 // 30 days
    });

    return new Response(JSON.stringify({
      success: true,
      feedbackId: uuid,
      message: 'Feedback submitted'
    }), {
      headers: jsonHeaders,
      status: 200
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      headers: jsonHeaders,
      status: 500
    });
  }
}

/**
 * Handle feedback voting
 * T074-T076: Process votes on feedback items
 */
async function handleFeedbackVote(request, env) {
  try {
    const body = await request.json();

    // Validate required fields
    const validation = validateRequestBody(body, ['userId', 'feedbackId']);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: validation.error
      }), {
        headers: jsonHeaders,
        status: 400
      });
    }

    // Check for duplicate vote (T074)
    const voteKey = `feedback-vote:${body.feedbackId}:${body.userId}`;
    const existingVote = await env.LEADERBOARD_QUEUE.get(voteKey);
    if (existingVote) {
      return new Response(JSON.stringify({
        error: 'Already voted on this feedback'
      }), {
        headers: jsonHeaders,
        status: 409
      });
    }

    // Rate limiting (T075)
    const rateLimit = await checkRateLimit(env, body.userId, 'feedback-vote', 20, 3600000); // 20 per hour
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limited',
        retryAfter: rateLimit.retryAfter
      }), {
        headers: jsonHeaders,
        status: 429
      });
    }

    // Store vote (T076)
    const voteData = {
      userId: body.userId,
      feedbackId: body.feedbackId,
      timestamp: Date.now()
    };

    await env.LEADERBOARD_QUEUE.put(voteKey, JSON.stringify(voteData));

    return new Response(JSON.stringify({
      success: true,
      message: 'Feedback vote recorded'
    }), {
      headers: jsonHeaders,
      status: 200
    });

  } catch (error) {
    console.error('Feedback vote error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      headers: jsonHeaders,
      status: 500
    });
  }
}