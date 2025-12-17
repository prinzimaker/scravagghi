// ============================================
// REPLAYS API - Scravagghi
// Gestione completa replay, clip e tutorial
// ============================================

const express = require('express');
const router = express.Router();
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const zlib = require('zlib');
const { requireAuth, requireTier } = require('../middleware/auth');
const db = require('../database/pool');

// Storage client (R2 or S3)
const storage = new S3Client({
  region: process.env.STORAGE_TYPE === 'r2' ? 'auto' : process.env.AWS_REGION,
  endpoint: process.env.STORAGE_TYPE === 'r2'
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined,
  credentials: {
    accessKeyId: process.env.STORAGE_TYPE === 'r2'
      ? process.env.R2_ACCESS_KEY_ID
      : process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_TYPE === 'r2'
      ? process.env.R2_SECRET_ACCESS_KEY
      : process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET_NAME = process.env.STORAGE_TYPE === 'r2'
  ? process.env.R2_BUCKET_NAME
  : process.env.S3_BUCKET_NAME;

// ============================================
// Helper Functions
// ============================================

async function loadReplayFromStorage(storageKey) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey
  });

  const response = await storage.send(command);
  const compressed = await streamToBuffer(response.Body);
  const decompressed = zlib.gunzipSync(compressed);
  return JSON.parse(decompressed.toString());
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function checkReplayAccess(userId, gameId) {
  // Check if replay is public
  const replay = await db.query(
    'SELECT is_public, is_featured FROM game_replays WHERE game_id = $1',
    [gameId]
  );

  if (!replay) {
    return { hasAccess: false, reason: 'not_found' };
  }

  // Public replays accessible to all
  if (replay.is_public || replay.is_featured) {
    return { hasAccess: true, type: 'public' };
  }

  // Check user access
  if (userId) {
    const access = await db.query(
      'SELECT access_type FROM replay_access WHERE user_id = $1 AND game_id = $2',
      [userId, gameId]
    );

    if (access) {
      return { hasAccess: true, type: access.access_type };
    }

    // Check if user was participant (for premium users)
    const userTier = await db.query('SELECT tier FROM users WHERE id = $1', [userId]);

    if (userTier && (userTier.tier === 'premium' || userTier.tier === 'premium_plus')) {
      const isParticipant = await db.query(
        'SELECT 1 FROM game_players WHERE game_id = $1 AND user_id = $2',
        [gameId, userId]
      );

      if (isParticipant) {
        // Auto-grant access
        await db.query(
          `INSERT INTO replay_access (user_id, game_id, access_type)
           VALUES ($1, $2, 'premium')
           ON CONFLICT DO NOTHING`,
          [userId, gameId]
        );

        return { hasAccess: true, type: 'premium' };
      }
    }
  }

  return { hasAccess: false, reason: 'premium_required' };
}

// ============================================
// ENDPOINTS
// ============================================

// Get featured replays (public, no auth required)
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const replays = await db.query(`
      SELECT
        gr.game_id,
        gr.created_at,
        gr.view_count,
        gr.max_damage_single_shot,
        gr.mvp_player_id,
        g.duration_ms,
        g.type,
        json_agg(
          json_build_object(
            'user_id', gp.user_id,
            'username', u.username,
            'team', gp.team,
            'result', gp.result,
            'damage_dealt', gp.damage_dealt
          ) ORDER BY gp.team, gp.user_id
        ) as players
      FROM game_replays gr
      JOIN games g ON gr.game_id = g.id
      JOIN game_players gp ON g.id = gp.game_id
      JOIN users u ON gp.user_id = u.id
      WHERE gr.is_public = true OR gr.is_featured = true
      GROUP BY gr.game_id, g.duration_ms, g.type, gr.created_at, gr.view_count, gr.max_damage_single_shot, gr.mvp_player_id
      ORDER BY gr.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json(replays);
  } catch (error) {
    console.error('Error fetching featured replays:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific replay
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // Check access
    const accessCheck = await checkReplayAccess(userId, id);

    if (!accessCheck.hasAccess) {
      if (accessCheck.reason === 'not_found') {
        return res.status(404).json({ error: 'Replay not found' });
      }

      return res.status(402).json({
        error: 'Premium required',
        upgradeUrl: '/premium',
        purchaseUrl: `/api/replays/${id}/purchase`,
        price: 0.50
      });
    }

    // Get replay metadata
    const replayMeta = await db.query(
      'SELECT * FROM game_replays WHERE game_id = $1',
      [id]
    );

    // Load from storage
    const replayData = await loadReplayFromStorage(replayMeta.storage_key);

    // Increment view count
    await db.query(
      'UPDATE game_replays SET view_count = view_count + 1 WHERE game_id = $1',
      [id]
    );

    // Track user view
    if (userId) {
      await db.query(
        `INSERT INTO replay_access (user_id, game_id, access_type, last_viewed_at, view_count)
         VALUES ($1, $2, $3, NOW(), 1)
         ON CONFLICT (user_id, game_id)
         DO UPDATE SET last_viewed_at = NOW(), view_count = replay_access.view_count + 1`,
        [userId, id, accessCheck.type]
      );
    }

    // Return compressed data (client will decompress)
    res.set('Content-Type', 'application/gzip');
    res.set('Content-Encoding', 'gzip');
    res.send(zlib.gzipSync(JSON.stringify(replayData)));

  } catch (error) {
    console.error('Error loading replay:', error);
    res.status(500).json({ error: 'Failed to load replay' });
  }
});

// Purchase replay (pay-per-view)
router.post('/:id/purchase', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const REPLAY_PRICE = 0.50;

    // Check if already owns
    const existingAccess = await db.query(
      'SELECT 1 FROM replay_access WHERE user_id = $1 AND game_id = $2',
      [userId, id]
    );

    if (existingAccess) {
      return res.status(400).json({ error: 'Already have access to this replay' });
    }

    // Check wallet balance
    const user = await db.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);

    if (user.wallet_balance < REPLAY_PRICE) {
      return res.status(402).json({
        error: 'Insufficient wallet balance',
        required: REPLAY_PRICE,
        current: user.wallet_balance,
        depositUrl: '/api/payment/wallet/deposit'
      });
    }

    // Start transaction
    await db.query('BEGIN');

    try {
      // Deduct from wallet
      await db.query(
        'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
        [REPLAY_PRICE, userId]
      );

      // Grant access
      await db.query(
        `INSERT INTO replay_access (user_id, game_id, access_type, purchased_at, purchase_price)
         VALUES ($1, $2, 'purchased', NOW(), $3)`,
        [userId, id, REPLAY_PRICE]
      );

      // Create transaction record
      await db.query(
        `INSERT INTO transactions (user_id, type, amount, currency, status, related_game_id)
         VALUES ($1, 'replay_purchase', $2, 'EUR', 'completed', $3)`,
        [userId, -REPLAY_PRICE, id]
      );

      await db.query('COMMIT');

      res.json({
        success: true,
        accessGranted: true,
        newBalance: user.wallet_balance - REPLAY_PRICE
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error purchasing replay:', error);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

// Download replay (premium feature)
router.get('/:id/download', requireAuth, requireTier('premium'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check access
    const accessCheck = await checkReplayAccess(userId, id);

    if (!accessCheck.hasAccess) {
      return res.status(403).json({ error: 'No access to this replay' });
    }

    // Load replay
    const replayMeta = await db.query(
      'SELECT * FROM game_replays WHERE game_id = $1',
      [id]
    );

    const replayData = await loadReplayFromStorage(replayMeta.storage_key);

    // Increment download count
    await db.query(
      'UPDATE game_replays SET download_count = download_count + 1 WHERE game_id = $1',
      [id]
    );

    // Send as downloadable file
    res.set('Content-Type', 'application/json');
    res.set('Content-Disposition', `attachment; filename="scravagghi-replay-${id}.json"`);
    res.json(replayData);

  } catch (error) {
    console.error('Error downloading replay:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// ============================================
// CLIPS
// ============================================

// Create clip
router.post('/clips', requireAuth, requireTier('premium'), async (req, res) => {
  try {
    const { gameId, title, startTimestamp, endTimestamp } = req.body;
    const userId = req.user.userId;

    // Validate
    if (!title || title.length < 3 || title.length > 255) {
      return res.status(400).json({ error: 'Title must be 3-255 characters' });
    }

    if (endTimestamp - startTimestamp > 60000) {
      return res.status(400).json({ error: 'Clip too long (max 60 seconds)' });
    }

    if (endTimestamp - startTimestamp < 1000) {
      return res.status(400).json({ error: 'Clip too short (min 1 second)' });
    }

    // Check replay access
    const accessCheck = await checkReplayAccess(userId, gameId);

    if (!accessCheck.hasAccess) {
      return res.status(403).json({ error: 'No access to this replay' });
    }

    // Create clip
    const clipId = require('crypto').randomUUID();

    await db.query(
      `INSERT INTO replay_clips
       (id, game_id, creator_user_id, title, start_timestamp, end_timestamp, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [clipId, gameId, userId, title, startTimestamp, endTimestamp]
    );

    const shareUrl = `${process.env.APP_URL}/clips/${clipId}`;

    res.json({
      clipId,
      shareUrl
    });

  } catch (error) {
    console.error('Error creating clip:', error);
    res.status(500).json({ error: 'Failed to create clip' });
  }
});

// Get clip
router.get('/clips/:clipId', async (req, res) => {
  try {
    const { clipId } = req.params;

    const clip = await db.query(`
      SELECT c.*, gr.storage_key, u.username as creator_name
      FROM replay_clips c
      JOIN game_replays gr ON c.game_id = gr.game_id
      LEFT JOIN users u ON c.creator_user_id = u.id
      WHERE c.id = $1
    `, [clipId]);

    if (!clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    // Increment views
    await db.query('UPDATE replay_clips SET views = views + 1 WHERE id = $1', [clipId]);

    // Load full replay
    const fullReplay = await loadReplayFromStorage(clip.storage_key);

    // Extract clip portion
    const clipData = {
      ...fullReplay,
      actions: fullReplay.actions.filter(a =>
        a.timestamp >= clip.start_timestamp && a.timestamp <= clip.end_timestamp
      ),
      isClip: true,
      clipInfo: {
        id: clipId,
        title: clip.title,
        creator: clip.creator_name,
        views: clip.views,
        likes: clip.likes
      }
    };

    // Return compressed
    res.set('Content-Type', 'application/gzip');
    res.set('Content-Encoding', 'gzip');
    res.send(zlib.gzipSync(JSON.stringify(clipData)));

  } catch (error) {
    console.error('Error loading clip:', error);
    res.status(500).json({ error: 'Failed to load clip' });
  }
});

// Like clip
router.post('/clips/:clipId/like', requireAuth, async (req, res) => {
  try {
    const { clipId } = req.params;
    const userId = req.user.userId;

    // Toggle like
    const existing = await db.query(
      'SELECT 1 FROM clip_likes WHERE clip_id = $1 AND user_id = $2',
      [clipId, userId]
    );

    if (existing) {
      // Unlike
      await db.query(
        'DELETE FROM clip_likes WHERE clip_id = $1 AND user_id = $2',
        [clipId, userId]
      );

      res.json({ liked: false });
    } else {
      // Like
      await db.query(
        'INSERT INTO clip_likes (clip_id, user_id) VALUES ($1, $2)',
        [clipId, userId]
      );

      res.json({ liked: true });
    }

  } catch (error) {
    console.error('Error toggling clip like:', error);
    res.status(500).json({ error: 'Failed to like clip' });
  }
});

// ============================================
// TUTORIALS
// ============================================

// Get tutorials list
router.get('/tutorials', async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    let query = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.difficulty,
        t.category,
        t.views,
        t.completion_count,
        CASE
          WHEN t.rating_count > 0 THEN (t.rating_sum::float / t.rating_count)
          ELSE 0
        END as avg_rating,
        u.username as creator_name,
        t.is_official
      FROM tutorials t
      LEFT JOIN users u ON t.creator_user_id = u.id
      WHERE t.is_public = true
    `;

    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND t.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (difficulty) {
      query += ` AND t.difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    query += ` ORDER BY t.is_official DESC, avg_rating DESC, t.views DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const tutorials = await db.query(query, params);

    res.json(tutorials);

  } catch (error) {
    console.error('Error fetching tutorials:', error);
    res.status(500).json({ error: 'Failed to fetch tutorials' });
  }
});

// Get specific tutorial
router.get('/tutorials/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tutorial = await db.query(`
      SELECT
        t.*,
        u.username as creator_name,
        gr.storage_key
      FROM tutorials t
      LEFT JOIN users u ON t.creator_user_id = u.id
      JOIN game_replays gr ON t.base_replay_id = gr.game_id
      WHERE t.id = $1 AND t.is_public = true
    `, [id]);

    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    // Increment views
    await db.query('UPDATE tutorials SET views = views + 1 WHERE id = $1', [id]);

    // Load base replay
    const baseReplay = await loadReplayFromStorage(tutorial.storage_key);

    // Combine with annotations
    const tutorialData = {
      ...baseReplay,
      isTutorial: true,
      tutorialInfo: {
        id: tutorial.id,
        title: tutorial.title,
        description: tutorial.description,
        difficulty: tutorial.difficulty,
        category: tutorial.category,
        creator: tutorial.creator_name,
        isOfficial: tutorial.is_official
      },
      annotations: JSON.parse(tutorial.annotations)
    };

    res.set('Content-Type', 'application/gzip');
    res.set('Content-Encoding', 'gzip');
    res.send(zlib.gzipSync(JSON.stringify(tutorialData)));

  } catch (error) {
    console.error('Error loading tutorial:', error);
    res.status(500).json({ error: 'Failed to load tutorial' });
  }
});

// Create tutorial (Premium+ only)
router.post('/tutorials', requireAuth, requireTier('premium_plus'), async (req, res) => {
  try {
    const { title, description, baseReplayId, difficulty, category, annotations } = req.body;
    const userId = req.user.userId;

    // Validate
    if (!title || !baseReplayId || !annotations || !Array.isArray(annotations)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check replay access
    const accessCheck = await checkReplayAccess(userId, baseReplayId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ error: 'No access to base replay' });
    }

    // Create tutorial
    const tutorialId = require('crypto').randomUUID();

    await db.query(
      `INSERT INTO tutorials
       (id, creator_user_id, base_replay_id, title, description, difficulty, category, annotations, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
      [tutorialId, userId, baseReplayId, title, description, difficulty, category, JSON.stringify(annotations)]
    );

    res.json({ tutorialId });

  } catch (error) {
    console.error('Error creating tutorial:', error);
    res.status(500).json({ error: 'Failed to create tutorial' });
  }
});

// Rate tutorial
router.post('/tutorials/:id/rate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.userId;

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }

    // Insert or update rating
    await db.query(
      `INSERT INTO tutorial_ratings (tutorial_id, user_id, rating, review)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tutorial_id, user_id)
       DO UPDATE SET rating = $3, review = $4`,
      [id, userId, rating, review]
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Error rating tutorial:', error);
    res.status(500).json({ error: 'Failed to rate tutorial' });
  }
});

module.exports = router;
