# 🎬 Replay System – Scravagghi

Sistema completo di replay, clip, tutorial e statistiche basato sull'architettura client-heavy.

---

## 🎯 Principio Fondamentale

**Il server logga comandi, il client riproduce deterministicamente.**

Non si salvano screenshot o video, ma una **sequenza di comandi** che il client può rieseguire identicamente.

### Vantaggi

- **File leggerissimi**: 3-8 KB per partita (compressi)
- **Implementazione semplice**: già parte dell'architettura
- **Costo storage**: ~€0.001 per replay
- **Modifica velocità**: 0.25x, 0.5x, 1x, 2x, 4x, 8x
- **Seek istantaneo**: salta a qualsiasi punto

---

## 📦 Formato Replay

### Struttura Dati

```json
{
  "version": 1,
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "players": [
    {"id": "user-1", "name": "Aldo", "team": 1},
    {"id": "user-2", "name": "Mario", "team": 2}
  ],
  "initialSeed": 1234567890,
  "mapId": 3,
  "gameSettings": {
    "wind": 5,
    "turnTime": 10000
  },
  "actions": [
    {
      "timestamp": 0,
      "type": "turn_start",
      "playerId": "user-1",
      "seed": 123456
    },
    {
      "timestamp": 5234,
      "type": "player_action",
      "playerId": "user-1",
      "action": "shoot",
      "angle": 45.2,
      "power": 0.78,
      "weapon": "poop_ball"
    },
    {
      "timestamp": 7891,
      "type": "turn_complete",
      "damage": {"user-2": 35},
      "deaths": [],
      "terrainMods": [{"x": 450, "y": 320, "radius": 30}]
    },
    {
      "timestamp": 8100,
      "type": "turn_start",
      "playerId": "user-2",
      "seed": 234567
    }
  ],
  "winner": "user-1",
  "duration": 180000,
  "stats": {
    "totalShots": 15,
    "totalDamage": 385,
    "maxDamageSingleShot": 65
  }
}
```

### Compressione

```javascript
const zlib = require('zlib');

// Comprimi
const compressed = zlib.gzipSync(JSON.stringify(replayData));
// Dimensione: 3-8 KB (da ~30-50 KB originale)

// Decomprimi
const decompressed = zlib.gunzipSync(compressed);
const replayData = JSON.parse(decompressed);
```

---

## 💾 Storage e Retrieval

### Server: Salvataggio

```javascript
// server/src/replays/storage.js

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const zlib = require('zlib');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function saveReplay(game, winnerId) {
  const replayData = {
    version: 1,
    gameId: game.id,
    players: game.players.map(p => ({
      id: p.userId,
      name: p.username,
      team: p.team
    })),
    initialSeed: game.initialSeed,
    mapId: game.mapId,
    gameSettings: game.settings,
    actions: game.replayLog,
    winner: winnerId,
    duration: Date.now() - game.startTime,
    stats: calculateGameStats(game)
  };

  // Comprimi
  const compressed = zlib.gzipSync(JSON.stringify(replayData));

  // Upload su S3/R2
  const storageKey = `replays/${game.id}.replay.gz`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.REPLAY_BUCKET,
    Key: storageKey,
    Body: compressed,
    ContentType: 'application/gzip',
    ContentEncoding: 'gzip'
  }));

  // Salva metadata in database
  await db.query(`
    INSERT INTO game_replays
    (game_id, storage_key, size_bytes, action_count, max_damage_single_shot, mvp_player_id)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    game.id,
    storageKey,
    compressed.length,
    game.replayLog.length,
    replayData.stats.maxDamageSingleShot,
    replayData.stats.mvpPlayerId
  ]);

  // Grant access ai partecipanti
  for (const player of game.players) {
    await db.query(`
      INSERT INTO replay_access (user_id, game_id, access_type)
      VALUES ($1, $2, 'owner')
    `, [player.userId, game.id]);
  }

  return storageKey;
}

function calculateGameStats(game) {
  let maxDamage = 0;
  let totalShots = 0;
  let totalDamage = 0;
  const playerDamage = {};

  for (const action of game.replayLog) {
    if (action.type === 'player_action') {
      totalShots++;
    }
    if (action.type === 'turn_complete' && action.damage) {
      const turnDamage = Object.values(action.damage).reduce((a, b) => a + b, 0);
      totalDamage += turnDamage;
      maxDamage = Math.max(maxDamage, turnDamage);

      // Track damage per player
      const playerId = action.playerId;
      playerDamage[playerId] = (playerDamage[playerId] || 0) + turnDamage;
    }
  }

  // MVP = most damage dealt
  const mvpPlayerId = Object.entries(playerDamage)
    .sort(([,a], [,b]) => b - a)[0]?.[0];

  return {
    totalShots,
    totalDamage,
    maxDamageSingleShot: maxDamage,
    mvpPlayerId
  };
}
```

### Client: Caricamento

```javascript
// client/src/scenes/ReplayScene.js

async loadReplay(replayId) {
  const token = localStorage.getItem('authToken');

  // Fetch from server
  const response = await fetch(`/api/replays/${replayId}`, {
    headers: token ? {'Authorization': `Bearer ${token}`} : {}
  });

  if (response.status === 402) {
    throw new Error('Premium required');
  }

  if (response.status === 404) {
    throw new Error('Replay not found');
  }

  // Download compressed data
  const arrayBuffer = await response.arrayBuffer();

  // Decompress
  const decompressed = pako.inflate(new Uint8Array(arrayBuffer), {to: 'string'});

  // Parse
  this.replayData = JSON.parse(decompressed);

  // Validate version
  if (this.replayData.version !== 1) {
    throw new Error('Unsupported replay version');
  }

  return this.replayData;
}
```

---

## 🎮 Replay Player Features

### Controlli Base

- **Play/Pause**: ⏸ / ▶
- **Speed**: 0.25x, 0.5x, 1x, 2x, 4x, 8x
- **Seek**: click su timeline
- **Restart**: ⏮

### Controlli Avanzati (Premium+)

- **Frame-by-frame**: ◀ / ▶ (1 frame avanti/indietro)
- **Slow-motion**: impostazione custom 0.1x - 10x
- **Loop section**: selezione inizio/fine per loop
- **Camera follow**: segui giocatore specifico

---

## 📊 Sistema Statistiche

### Analisi Replay

```javascript
// client/src/replay/ReplayAnalyzer.js

class ReplayAnalyzer {
  constructor(replayData) {
    this.data = replayData;
  }

  calculatePlayerStats() {
    const stats = {};

    // Initialize
    for (const player of this.data.players) {
      stats[player.id] = {
        name: player.name,
        shots: 0,
        hits: 0,
        misses: 0,
        totalDamage: 0,
        maxDamage: 0,
        kills: 0,
        deaths: 0,
        avgShotTime: [],
        weaponUsage: {}
      };
    }

    let lastTurnStart = null;

    // Process actions
    for (let i = 0; i < this.data.actions.length; i++) {
      const action = this.data.actions[i];

      if (action.type === 'turn_start') {
        lastTurnStart = action;
      }

      if (action.type === 'player_action') {
        const playerStat = stats[action.playerId];
        playerStat.shots++;

        // Weapon tracking
        playerStat.weaponUsage[action.weapon] =
          (playerStat.weaponUsage[action.weapon] || 0) + 1;

        // Shot time
        if (lastTurnStart) {
          const shotTime = action.timestamp - lastTurnStart.timestamp;
          playerStat.avgShotTime.push(shotTime);
        }

        // Find result
        const nextComplete = this.data.actions
          .slice(i + 1)
          .find(a => a.type === 'turn_complete');

        if (nextComplete) {
          const totalDamage = Object.values(nextComplete.damage || {})
            .reduce((sum, dmg) => sum + dmg, 0);

          if (totalDamage > 0) {
            playerStat.hits++;
            playerStat.totalDamage += totalDamage;
            playerStat.maxDamage = Math.max(playerStat.maxDamage, totalDamage);
          } else {
            playerStat.misses++;
          }

          // Kills
          if (nextComplete.deaths && nextComplete.deaths.length > 0) {
            playerStat.kills += nextComplete.deaths.length;

            for (const death of nextComplete.deaths) {
              stats[death.playerId].deaths++;
            }
          }
        }
      }
    }

    // Calculate averages
    for (const playerStat of Object.values(stats)) {
      if (playerStat.avgShotTime.length > 0) {
        const avg = playerStat.avgShotTime.reduce((a, b) => a + b, 0) /
                    playerStat.avgShotTime.length;
        playerStat.avgShotTime = (avg / 1000).toFixed(1); // seconds
      } else {
        playerStat.avgShotTime = 0;
      }

      playerStat.accuracy = playerStat.shots > 0
        ? ((playerStat.hits / playerStat.shots) * 100).toFixed(1)
        : 0;
    }

    return stats;
  }

  generateHeatmap() {
    // Grid 80x60 (per 800x600 game area)
    const heatmap = Array(80).fill(0).map(() => Array(60).fill(0));

    for (const action of this.data.actions) {
      if (action.type === 'turn_complete' && action.terrainMods) {
        for (const mod of action.terrainMods) {
          const gridX = Math.floor(mod.x / 10);
          const gridY = Math.floor(mod.y / 10);

          if (gridX >= 0 && gridX < 80 && gridY >= 0 && gridY < 60) {
            heatmap[gridX][gridY]++;
          }
        }
      }
    }

    return heatmap;
  }

  getKeyMoments() {
    const moments = [];

    for (let i = 0; i < this.data.actions.length; i++) {
      const action = this.data.actions[i];

      // Death moment
      if (action.type === 'turn_complete' && action.deaths?.length > 0) {
        moments.push({
          timestamp: action.timestamp,
          type: 'death',
          description: `${action.deaths[0].playerName} eliminated!`
        });
      }

      // High damage moment
      if (action.type === 'turn_complete' && action.damage) {
        const maxDmg = Math.max(...Object.values(action.damage));
        if (maxDmg >= 40) {
          moments.push({
            timestamp: action.timestamp,
            type: 'big_hit',
            description: `${maxDmg} damage!`
          });
        }
      }
    }

    return moments;
  }
}
```

---

## ✂️ Clip Creator

### Creazione Clip

```javascript
// client/src/replay/ClipCreator.js

class ClipCreator {
  async createClip(gameId, title, startTime, endTime) {
    // Validate
    if (endTime - startTime > 60000) {
      throw new Error('Clip too long (max 60s)');
    }

    if (endTime - startTime < 1000) {
      throw new Error('Clip too short (min 1s)');
    }

    // Send to server
    const response = await fetch('/api/replays/clips', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gameId,
        title,
        startTimestamp: startTime,
        endTimestamp: endTime
      })
    });

    const {clipId, shareUrl} = await response.json();
    return {clipId, shareUrl};
  }

  async shareToSocial(clipUrl, platform) {
    const text = encodeURIComponent('Check out this epic Scravagghi moment!');
    const url = encodeURIComponent(clipUrl);

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      reddit: `https://reddit.com/submit?url=${url}&title=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`
    };

    window.open(urls[platform], '_blank');
  }
}
```

### Server Endpoint

```javascript
// server/src/api/clips.js

router.post('/replays/clips', requirePremium, async (req, res) => {
  const {gameId, title, startTimestamp, endTimestamp} = req.body;

  // Validate
  if (endTimestamp - startTimestamp > 60000) {
    return res.status(400).json({error: 'Clip too long (max 60s)'});
  }

  // Check access to replay
  const hasAccess = await db.query(`
    SELECT 1 FROM replay_access
    WHERE user_id = $1 AND game_id = $2
  `, [req.user.userId, gameId]);

  if (!hasAccess) {
    return res.status(403).json({error: 'No access to this replay'});
  }

  // Create clip
  const clipId = uuidv4();

  await db.query(`
    INSERT INTO replay_clips
    (id, game_id, creator_user_id, title, start_timestamp, end_timestamp, is_public)
    VALUES ($1, $2, $3, $4, $5, $6, true)
  `, [clipId, gameId, req.user.userId, title, startTimestamp, endTimestamp]);

  const shareUrl = `${process.env.APP_URL}/clips/${clipId}`;

  res.json({clipId, shareUrl});
});

// Public clip viewer
router.get('/clips/:clipId', async (req, res) => {
  const clip = await db.query(`
    SELECT c.*, gr.storage_key, u.username as creator_name
    FROM replay_clips c
    JOIN game_replays gr ON c.game_id = gr.game_id
    LEFT JOIN users u ON c.creator_user_id = u.id
    WHERE c.id = $1
  `, [req.params.clipId]);

  if (!clip) {
    return res.status(404).json({error: 'Clip not found'});
  }

  // Increment views
  await db.query('UPDATE replay_clips SET views = views + 1 WHERE id = $1', [req.params.clipId]);

  // Load full replay and extract clip portion
  const fullReplay = await loadReplayFromStorage(clip.storage_key);

  const clipData = {
    ...fullReplay,
    actions: fullReplay.actions.filter(a =>
      a.timestamp >= clip.start_timestamp && a.timestamp <= clip.end_timestamp
    ),
    isClip: true,
    clipInfo: {
      title: clip.title,
      creator: clip.creator_name,
      views: clip.views
    }
  };

  res.json(clipData);
});
```

---

## 🎓 Sistema Tutorial

### Tutorial con Annotazioni

```javascript
// Tutorial structure
{
  "id": "tutorial-uuid",
  "title": "Mastering Wind Shots",
  "baseReplayId": "game-uuid",
  "difficulty": "intermediate",
  "annotations": [
    {
      "timestamp": 3000,
      "type": "pause",
      "data": {
        "message": "Notice how the player aims slightly higher to compensate for wind",
        "resumeOnClick": true
      }
    },
    {
      "timestamp": 5000,
      "type": "highlight",
      "data": {
        "x": 250,
        "y": 180,
        "radius": 50,
        "duration": 3000,
        "message": "Wind indicator shows 5 pixels/s to the right"
      }
    },
    {
      "timestamp": 7000,
      "type": "slowmotion",
      "data": {
        "speed": 0.25,
        "duration": 4000,
        "message": "Watch the trajectory curve with the wind"
      }
    },
    {
      "timestamp": 11000,
      "type": "arrow",
      "data": {
        "fromX": 300,
        "fromY": 200,
        "toX": 400,
        "toY": 280,
        "duration": 2000,
        "message": "Perfect hit accounting for wind!"
      }
    }
  ]
}
```

### Tutorial Player

```javascript
// client/src/scenes/TutorialScene.js

class TutorialScene extends ReplayScene {
  executeAnnotation(annotation) {
    switch (annotation.type) {
      case 'pause':
        this.isPaused = true;
        this.showMessage(annotation.data.message);
        if (annotation.data.resumeOnClick) {
          this.input.once('pointerdown', () => {
            this.isPaused = false;
            this.hideMessage();
            this.playbackLoop();
          });
        }
        break;

      case 'highlight':
        const highlight = this.add.circle(
          annotation.data.x,
          annotation.data.y,
          annotation.data.radius,
          0xffff00,
          0.3
        );

        this.tweens.add({
          targets: highlight,
          alpha: {from: 0.3, to: 0.6},
          scale: {from: 1, to: 1.2},
          yoyo: true,
          repeat: -1,
          duration: 500
        });

        this.showMessage(annotation.data.message);

        setTimeout(() => {
          highlight.destroy();
          this.hideMessage();
        }, annotation.data.duration);
        break;

      case 'slowmotion':
        const originalSpeed = this.playbackSpeed;
        this.playbackSpeed = annotation.data.speed;
        this.showMessage(annotation.data.message);

        setTimeout(() => {
          this.playbackSpeed = originalSpeed;
          this.hideMessage();
        }, annotation.data.duration);
        break;

      case 'arrow':
        const graphics = this.add.graphics();
        graphics.lineStyle(3, 0xff0000);
        graphics.beginPath();
        graphics.moveTo(annotation.data.fromX, annotation.data.fromY);
        graphics.lineTo(annotation.data.toX, annotation.data.toY);
        graphics.strokePath();

        // Arrowhead
        const angle = Phaser.Math.Angle.Between(
          annotation.data.fromX,
          annotation.data.fromY,
          annotation.data.toX,
          annotation.data.toY
        );

        graphics.fillStyle(0xff0000);
        graphics.fillTriangle(
          annotation.data.toX,
          annotation.data.toY,
          annotation.data.toX - 15 * Math.cos(angle - 0.5),
          annotation.data.toY - 15 * Math.sin(angle - 0.5),
          annotation.data.toX - 15 * Math.cos(angle + 0.5),
          annotation.data.toY - 15 * Math.sin(angle + 0.5)
        );

        this.showMessage(annotation.data.message);

        setTimeout(() => {
          graphics.destroy();
          this.hideMessage();
        }, annotation.data.duration);
        break;
    }
  }
}
```

---

## 💰 Monetizzazione Replay

### Access Control

```javascript
// server/src/middleware/replayAccess.js

async function checkReplayAccess(req, res, next) {
  const {replayId} = req.params;
  const userId = req.user?.userId;

  // Check if replay is public
  const replay = await db.query(`
    SELECT is_public, is_featured FROM game_replays WHERE game_id = $1
  `, [replayId]);

  if (!replay) {
    return res.status(404).json({error: 'Replay not found'});
  }

  // Public replays accessible to all
  if (replay.is_public || replay.is_featured) {
    return next();
  }

  // User must be authenticated
  if (!userId) {
    return res.status(401).json({error: 'Authentication required'});
  }

  // Check user access
  const access = await db.query(`
    SELECT access_type FROM replay_access
    WHERE user_id = $1 AND game_id = $2
  `, [userId, replayId]);

  if (access) {
    return next(); // Has access
  }

  // Premium users can view their own games
  if (req.user.tier === 'premium' || req.user.tier === 'premium_plus') {
    const isParticipant = await db.query(`
      SELECT 1 FROM game_players WHERE game_id = $1 AND user_id = $2
    `, [replayId, userId]);

    if (isParticipant) {
      // Grant access
      await db.query(`
        INSERT INTO replay_access (user_id, game_id, access_type)
        VALUES ($1, $2, 'premium')
      `, [userId, replayId]);

      return next();
    }
  }

  // Offer purchase
  return res.status(402).json({
    error: 'Premium required',
    purchaseUrl: `/api/replays/${replayId}/purchase`,
    price: 0.50
  });
}
```

### Pay-Per-View

```javascript
// server/src/api/replays.js

router.post('/replays/:id/purchase', requireAuth, async (req, res) => {
  const {id} = req.params;
  const REPLAY_PRICE = 0.50;

  // Check wallet
  const user = await db.query('SELECT wallet_balance FROM users WHERE id = $1', [req.user.userId]);

  if (user.wallet_balance < REPLAY_PRICE) {
    return res.status(402).json({error: 'Insufficient balance'});
  }

  // Deduct
  await db.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
    [REPLAY_PRICE, req.user.userId]);

  // Grant access
  await db.query(`
    INSERT INTO replay_access (user_id, game_id, access_type, purchased_at, purchase_price)
    VALUES ($1, $2, 'purchased', NOW(), $3)
  `, [req.user.userId, id, REPLAY_PRICE]);

  // Transaction record
  await db.query(`
    INSERT INTO transactions (user_id, type, amount, status, related_game_id)
    VALUES ($1, 'replay_purchase', $2, 'completed', $3)
  `, [req.user.userId, -REPLAY_PRICE, id]);

  res.json({success: true, accessGranted: true});
});
```

---

## 📌 Best Practices

### Performance

- **Lazy load replays**: non precaricare tutti nella lista
- **Cache decompressi**: riutilizza replay già caricati
- **Throttle seek**: evita troppi seek rapidi

### Storage

- **Retention policy**:
  - Free: 30 giorni
  - Premium: 365 giorni
  - Premium+: illimitato
  - Tornei pubblici: illimitato

### Security

- **Validate replay data**: controlla versione e integrità
- **Rate limit downloads**: max 10/min per user
- **Watermark clips**: opzionale per protezione IP

---

**Vedi anche:**
- `ARCHITECTURE.md` - Architettura generale
- `MONETIZATION.md` - Dettagli prezzi
- `database/schema.sql` - Tabelle replay
