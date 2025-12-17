# 🏗️ Architecture – Scravagghi

Questo documento descrive l'architettura software di **Scravagghi**, basata su un modello **client-heavy** dove tutta la logica di gioco vive nel browser, mentre il server gestisce solo sincronizzazione, persistenza e monetizzazione.

---

## 🎯 Principi Architetturali Fondamentali

### Client-Heavy Architecture

**Il client è il game engine. Il server è il facilitatore.**

- **Client (Browser)**: contiene TUTTA la logica di gioco
  - Fisica e balistica
  - Collisioni e danni
  - Rendering e audio
  - Input e UI

- **Server (Node.js)**: facilita multiplayer e persistenza
  - Relay messaggi tra client
  - Validazione turni (chi può giocare, timeout)
  - Persistenza database
  - Monetizzazione

### Determinismo Assoluto

Per garantire che tutti i client vedano la **stessa partita**:

- **Seed condiviso**: ogni azione riceve un seed dal server
- **Fixed timestep**: fisica sempre a 1/60s
- **Niente Math.random()**: solo `DeterministicRandom(seed)`
- **Stesso codice**: versioning client obbligatorio

### Vantaggi Architettura

| Aspetto | Beneficio |
|---------|-----------|
| Costi server | Minimali (~€15/mese per 500 utenti) |
| Codice server | ~500 righe logica core |
| Scalabilità | Ottima (server stateless) |
| Development | Game logic scritta una volta sola |
| Latency | Irrilevante (gioco a turni) |
| Offline testing | Client testabile senza server |
| Replay system | Automatico e gratuito |

---

## 🧩 Panoramica Architetturale

```
┌────────────────────────────────────────────┐
│  CLIENT (Browser - Phaser 3)               │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ Game Engine (Phaser 3)               │ │
│  │ - Physics & Ballistics               │ │
│  │ - Terrain (deformable bitmap)        │ │
│  │ - Collision detection                │ │
│  │ - Damage calculation                 │ │
│  │ - Audio system                       │ │
│  │ - Rendering & animations             │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ Network Layer                        │ │
│  │ - WebSocket client                   │ │
│  │ - Send: player commands              │ │
│  │ - Receive: other players' commands   │ │
│  │ - Execute: deterministic replay      │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
                    │
                    │ WebSocket
                    │ {action: "shoot", angle: 45, power: 0.8}
                    │
┌────────────────────▼────────────────────────┐
│  SERVER (Node.js + Express + PostgreSQL)   │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ WebSocket Relay                      │ │
│  │ - Validate turn                      │ │
│  │ - Broadcast to all clients           │ │
│  │ - Log actions (replay)               │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ REST API                             │ │
│  │ - Authentication (JWT)               │ │
│  │ - User management                    │ │
│  │ - Tournament CRUD                    │ │
│  │ - Replay access control              │ │
│  │ - Payment webhooks                   │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ Database (PostgreSQL)                │ │
│  │ - Users & stats                      │ │
│  │ - Games & replays                    │ │
│  │ - Tournaments                        │ │
│  │ - Transactions                       │ │
│  │ - Tutorials & clips                  │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
                    │
┌───────────────────┴─────────────┬──────────┐
│                                 │          │
▼                                 ▼          ▼
Stripe API                  S3/R2        Analytics
(Payments)               (Replays)
```

---

## 🎮 Client Architecture

### Game Core (100% Client-Side)

Tutto il game engine vive nel client usando **Phaser 3**.

#### Moduli Principali

```javascript
client/src/
├── game/
│   ├── GameState.js           // Stato partita
│   ├── Physics.js             // Balistica custom
│   ├── TerrainMask.js         // Terreno deformabile
│   ├── DamageCalculator.js    // Calcolo danni
│   ├── CollisionDetector.js   // Collisioni
│   └── DeterministicRandom.js // RNG deterministico
│
├── scenes/
│   ├── GameScene.js           // Partita live
│   ├── ReplayScene.js         // Visualizzazione replay
│   ├── MenuScene.js           // Menu principale
│   └── LobbyScene.js          // Matchmaking
│
├── systems/
│   ├── SoundManager.js        // Audio (seed-based selection)
│   ├── InputHandler.js        // Drag-to-aim
│   └── UIManager.js           // HUD, barre vita, timer
│
└── network/
    └── GameClient.js          // WebSocket wrapper
```

### Game State

Ogni client mantiene una **copia completa** dello stato di gioco:

```javascript
class GameState {
  constructor(initialSeed) {
    this.beetles = [
      {id, playerId, team, x, y, hp, flipped, enhancements}
    ];
    this.terrain = new TerrainMask(800, 600);
    this.traps = [];
    this.currentTurn = null;
    this.round = 1;
    this.seed = initialSeed;
  }

  // Applica azione ricevuta da server
  applyAction(action) {
    const result = this.simulateAction(action);
    this.updateState(result);
    return result;
  }

  // Simula fisica deterministicamente
  simulateAction(action) {
    const rng = new DeterministicRandom(action.seed);
    const shot = Physics.simulateShot(
      action.angle,
      action.power,
      action.weapon,
      rng
    );

    const damage = this.calculateDamage(shot.impact);
    const terrainMods = this.calculateTerrainDeformation(shot.impact);

    return { shot, damage, terrainMods };
  }
}
```

### Deterministic Physics

**Critico**: la fisica deve essere identica su tutti i client.

```javascript
// Constants (IMMUTABILI)
const PHYSICS_CONFIG = {
  GRAVITY: -980,        // pixel/s²
  TIMESTEP: 1/60,       // 60 FPS fixed
  MAX_ITERATIONS: 600,  // 10 sec max
  DRAG: 0.001
};

// Simulazione con seed
function simulateShot(angle, power, seed) {
  const rng = new DeterministicRandom(seed);

  let pos = startPosition;
  let vel = {
    x: Math.cos(angle * Math.PI/180) * power * 500,
    y: Math.sin(angle * Math.PI/180) * power * 500
  };

  const path = [];

  for (let i = 0; i < PHYSICS_CONFIG.MAX_ITERATIONS; i++) {
    // Gravity
    vel.y += PHYSICS_CONFIG.GRAVITY * PHYSICS_CONFIG.TIMESTEP;

    // Wind (deterministico con seed)
    const windVariation = (rng.next() - 0.5) * 0.2;
    vel.x += currentWind * (1 + windVariation) * PHYSICS_CONFIG.TIMESTEP;

    // Update position
    pos.x += vel.x * PHYSICS_CONFIG.TIMESTEP;
    pos.y += vel.y * PHYSICS_CONFIG.TIMESTEP;

    path.push({x: pos.x, y: pos.y});

    // Collision check
    if (checkCollision(pos)) {
      return { path, impact: pos, velocity: vel };
    }
  }

  return { path, impact: null };
}
```

### Audio System (Client-Side)

```javascript
class SoundManager {
  constructor(scene) {
    this.scene = scene;
    this.sounds = {
      byte: { low: [], med: [], hig: [] },
      kill: [],
      frust: []
    };
  }

  // Carica sound pack (default o custom premium)
  async loadSoundPack(packUrl) {
    const basePath = packUrl || '/sounds/default';

    this.sounds.byte.low = await this.loadFolder(`${basePath}/byte/low`);
    this.sounds.byte.med = await this.loadFolder(`${basePath}/byte/med`);
    this.sounds.byte.hig = await this.loadFolder(`${basePath}/byte/hig`);
    this.sounds.kill = await this.loadFolder(`${basePath}/kill`);
    this.sounds.frust = await this.loadFolder(`${basePath}/frust`);
  }

  // Selezione DETERMINISTICA con seed
  playDamageSound(intensity, seed) {
    const rng = new DeterministicRandom(seed);

    let folder;
    if (intensity < 10) folder = this.sounds.byte.low;
    else if (intensity < 25) folder = this.sounds.byte.med;
    else folder = this.sounds.byte.hig;

    const index = Math.floor(rng.next() * folder.length);
    this.scene.sound.play(folder[index]);
  }
}
```

---

## 🖥️ Server Architecture

### Principio: Server Leggero

Il server **NON** contiene logica di gioco. Solo:

1. Relay messaggi WebSocket
2. Validazione turni
3. Database persistence
4. Payment processing

### WebSocket Game Server

```javascript
const games = new Map(); // In-memory game rooms

class Game {
  constructor(id, players) {
    this.id = id;
    this.players = players; // [{userId, ws, team}]
    this.currentTurnIndex = 0;
    this.turnStartTime = null;
    this.seed = Date.now();
    this.replayLog = []; // ← Logging per replay
  }

  getCurrentPlayer() {
    return this.players[this.currentTurnIndex];
  }

  nextTurn() {
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
    this.seed = (this.seed * 1103515245 + 12345) % 2147483648;
    this.turnStartTime = Date.now();
  }

  broadcast(message) {
    for (const player of this.players) {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
      }
    }
  }

  logAction(action) {
    this.replayLog.push({
      timestamp: Date.now() - this.startTime,
      ...action
    });
  }
}

// Message handling
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const msg = JSON.parse(data);

    switch (msg.type) {
      case 'player_action':
        const game = games.get(gameId);

        // Validate turn
        if (game.getCurrentPlayer().userId !== userId) {
          ws.send(JSON.stringify({type: 'error', message: 'Not your turn'}));
          return;
        }

        // Validate timeout
        if (Date.now() - game.turnStartTime > 10000) {
          ws.send(JSON.stringify({type: 'error', message: 'Timeout'}));
          return;
        }

        // ✅ Valid → Log and broadcast
        game.logAction(msg);

        game.broadcast({
          type: 'player_action',
          playerId: userId,
          angle: msg.angle,
          power: msg.power,
          weapon: msg.weapon,
          seed: game.seed
        });
        break;
    }
  });
});
```

### REST API Endpoints

```javascript
// Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh

// User management
GET    /api/users/:id
PATCH  /api/users/:id
GET    /api/users/:id/stats

// Tournaments
GET    /api/tournaments
POST   /api/tournaments
POST   /api/tournaments/:id/join
GET    /api/tournaments/:id/bracket

// Replays
GET    /api/replays/featured
GET    /api/replays/:id
POST   /api/replays/:id/purchase
GET    /api/replays/:id/download

// Clips
POST   /api/replays/clips
GET    /api/clips/:id
POST   /api/clips/:id/like

// Tutorials
GET    /api/tutorials
GET    /api/tutorials/:id
POST   /api/tutorials
POST   /api/tutorials/:id/rate

// Payments
POST   /api/payment/subscribe-premium
POST   /api/payment/wallet/deposit
POST   /api/webhooks/stripe
```

---

## 🎬 Replay System Architecture

### Principio: Log Command, Replay Deterministicamente

```
Durante partita:
- Server logga TUTTI i comandi in ordine
- Nessun calcolo fisico server-side

Replay:
- Client scarica log comandi
- Esegue STESSI comandi con STESSI seed
- Risultato identico garantito dal determinismo
```

### Replay Data Structure

```javascript
{
  version: 1,
  gameId: "uuid",
  players: [
    {id: "aldo", name: "Aldo", team: 1},
    {id: "mario", name: "Mario", team: 2}
  ],
  initialSeed: 123456789,
  mapId: 3,
  actions: [
    {timestamp: 0, type: "turn_start", playerId: "aldo", seed: 123},
    {timestamp: 5200, type: "player_action", playerId: "aldo",
     angle: 45.2, power: 0.78, weapon: "poop_ball"},
    {timestamp: 8000, type: "turn_complete"},
    {timestamp: 8100, type: "turn_start", playerId: "mario", seed: 456},
    // ...
  ],
  winner: "aldo",
  duration: 180000
}
```

**Dimensione**: 3-8 KB compressa (gzip)

### Replay Storage

```javascript
// Fine partita: salva replay
async function endGame(game, winnerId) {
  const replayData = {
    version: 1,
    gameId: game.id,
    players: game.players.map(p => ({id: p.userId, name: p.username, team: p.team})),
    initialSeed: game.initialSeed,
    actions: game.replayLog,
    winner: winnerId,
    duration: Date.now() - game.startTime
  };

  // Comprimi (gzip riduce ~90%)
  const compressed = zlib.gzipSync(JSON.stringify(replayData));

  // Upload su S3/R2
  const storageKey = `replays/${game.id}.replay.gz`;
  await uploadToStorage(storageKey, compressed);

  // Salva metadata in database
  await db.query(`
    INSERT INTO game_replays
    (game_id, storage_key, size_bytes, action_count)
    VALUES ($1, $2, $3, $4)
  `, [game.id, storageKey, compressed.length, game.replayLog.length]);
}
```

### Replay Player (Client)

```javascript
class ReplayScene extends Phaser.Scene {
  async loadReplay(replayId) {
    // Fetch da server (con access control)
    const response = await fetch(`/api/replays/${replayId}`);
    const compressed = await response.arrayBuffer();

    // Decompress
    const decompressed = pako.inflate(new Uint8Array(compressed), {to: 'string'});
    this.replayData = JSON.parse(decompressed);

    // Inizializza game state
    this.gameState = new GameState(this.replayData.initialSeed);

    this.startPlayback();
  }

  playbackLoop() {
    const elapsed = (Date.now() - this.replayStartTime) * this.playbackSpeed;

    // Esegui azioni fino a timestamp corrente
    while (this.currentActionIndex < this.replayData.actions.length) {
      const action = this.replayData.actions[this.currentActionIndex];

      if (action.timestamp > elapsed) break;

      // Esegui azione (STESSA logica di partita live)
      this.gameState.applyAction(action);
      this.currentActionIndex++;
    }

    if (!this.isComplete) {
      requestAnimationFrame(() => this.playbackLoop());
    }
  }
}
```

---

## 📊 Database Layer

### Schema Principale

Vedi `database/schema.sql` per schema completo.

Tabelle principali:

- **users**: account, tier, stats
- **games**: partite giocate
- **game_players**: partecipanti
- **game_replays**: metadata replay
- **replay_access**: controllo accesso
- **replay_clips**: clip utenti
- **tutorials**: tutorial con annotazioni
- **tournaments**: tornei
- **tournament_matches**: bracket
- **transactions**: pagamenti
- **subscriptions**: abbonamenti Stripe

---

## 💰 Monetization Layer

### Tier System Integration

```javascript
// Middleware per proteggere endpoint
function requireTier(minTier) {
  return async (req, res, next) => {
    const tierLevel = {free: 0, premium: 1, premium_plus: 2};

    if (tierLevel[req.user.tier] < tierLevel[minTier]) {
      return res.status(403).json({
        error: `${minTier} tier required`,
        upgradeUrl: '/premium'
      });
    }

    next();
  };
}

// Esempi
app.get('/api/replays/:id', requireAuth, requireTier('premium'), getReplay);
app.post('/api/tutorials', requireAuth, requireTier('premium_plus'), createTutorial);
```

### Payment Processing

- **Stripe** per subscriptions
- **Webhook** per eventi automatici
- **Wallet interno** per tornei

---

## 🔐 Security & Anti-Cheat

### Client Version Control

```javascript
// Client invia versione con ogni richiesta
const CLIENT_VERSION = '1.0.5';

ws.send(JSON.stringify({
  type: 'player_action',
  version: CLIENT_VERSION,
  ...action
}));

// Server verifica
if (msg.version !== REQUIRED_CLIENT_VERSION) {
  ws.send({type: 'error', message: 'Client outdated', requiredVersion: REQUIRED_CLIENT_VERSION});
  ws.close();
}
```

### Action Validation

```javascript
// Server valida solo:
// 1. È il turno corretto?
// 2. Timeout non scaduto?
// 3. Valori plausibili (angle, power)?

function validateAction(game, userId, action) {
  if (game.getCurrentPlayer().userId !== userId) {
    return {valid: false, reason: 'Not your turn'};
  }

  if (Date.now() - game.turnStartTime > 10000) {
    return {valid: false, reason: 'Timeout'};
  }

  if (action.angle < -90 || action.angle > 90) {
    return {valid: false, reason: 'Invalid angle'};
  }

  if (action.power < 0 || action.power > 1) {
    return {valid: false, reason: 'Invalid power'};
  }

  return {valid: true};
}
```

### Suspicious Activity Logging

```javascript
// Log attività sospette
async function logSuspicious(userId, gameId, reason) {
  await db.query(`
    INSERT INTO suspicious_activities (user_id, game_id, reason, severity)
    VALUES ($1, $2, $3, 'medium')
  `, [userId, gameId, reason]);

  // Auto-ban se troppi sospetti
  const recentCount = await db.query(`
    SELECT COUNT(*) FROM suspicious_activities
    WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'
  `, [userId]);

  if (recentCount.count > 10) {
    await db.query(`UPDATE users SET banned_until = NOW() + INTERVAL '24 hours' WHERE id = $1`, [userId]);
  }
}
```

---

## 🚀 Scalability

### Horizontal Scaling

Server stateless permette scaling orizzontale:

```
Load Balancer
    │
    ├─── Server Instance 1 (games 1-100)
    ├─── Server Instance 2 (games 101-200)
    └─── Server Instance 3 (games 201-300)

    ↓
PostgreSQL (primary + replicas)
S3/R2 (replays)
```

### Performance Targets

| Metrica | Target |
|---------|--------|
| Concurrent games | 1000+ per instance |
| Players per game | 2-4 |
| Message latency | < 50ms (regional) |
| Replay load time | < 2s |
| Database queries | < 10ms (indexed) |

---

## 📌 Considerazioni Finali

Questa architettura permette:

✅ **Sviluppo veloce**: game logic una volta sola
✅ **Costi bassi**: server minimalista
✅ **Scalabilità**: stateless horizontal scaling
✅ **Replay gratis**: automatico dal design
✅ **Monetizzazione**: integrata nativamente
✅ **Testing facile**: client testabile offline

Il compromesso principale è il **determinismo obbligatorio**, che richiede attenzione al versioning del client e alla fisica.

---

**Vedi anche:**
- `REPLAY_SYSTEM.md` - Dettagli replay/clip/tutorial
- `DEPLOYMENT.md` - Guida deploy server
- `MONETIZATION.md` - Sistema pagamenti
- `database/schema.sql` - Schema database completo
